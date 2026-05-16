#version 300 es

precision highp float;
precision highp int;

uniform highp sampler2D uMainOutputTexture;
uniform highp sampler2D uVoroEdgeBufferTexture;
uniform highp sampler2D uVoroIndexBufferTexture;

uniform vec3 iResolution;
uniform float iTime;
uniform vec2 fCenterForce;
uniform float fCenterForceStrengthMod;

in vec2 vUv;

layout(location = 0) out vec4 outputColor;
layout(location = 1) out vec4 voroIndexBufferColor;

#define TAU 6.2831853
#define BASE_RM_ITERATIONS 40.
#define BACKFILL_LIGHT 1

float aspect;
float objID = 0.; // 0. = frame, 1. = media
float hmGlobal;

vec4 fetchIndices(vec2 uv) {
    return texelFetch(uVoroIndexBufferTexture, ivec2(uv*iResolution.xy), 0);
}

vec2 rawCoords(in vec2 screenCoords) {
    return vec2(screenCoords.x, iResolution.y - screenCoords.y);
}

vec2 normalizeCoords(in vec2 screenCoords) {
    return (screenCoords / iResolution.xy) * 2.0 - 1.0;
}

vec2 aspectCoords(in vec2 screenCoords) {
    return (screenCoords*2.0-iResolution.xy) / iResolution.y;
}

vec2 fragCoords() {
    vec2 fragCoord = gl_FragCoord.xy / iResolution.z;
    return fragCoord;
}

vec2 normalizedPCoords() {
    return normalizeCoords(fragCoords());
}

vec2 pCoords() {
    return aspectCoords(fragCoords());
}

vec2 cfCoords() {
    return aspectCoords(rawCoords(fCenterForce.xy));
}

vec2 pToUv(vec3 p) {
    return vec2(p.x / aspect * 0.5 + 0.5, p.y * 0.5 + 0.5);
}

// Compact, self-contained version of IQ's 3D value noise function
float n3D(vec3 p){
    const vec3 s = vec3(7, 157, 113);
    vec3 ip = floor(p); p -= ip;
    vec4 h = vec4(0., s.yz, s.y + s.z) + dot(ip, s);
    p = p*p*(3. - 2.*p);
    h = mix(fract(sin(mod(h, TAU))*43758.5453), fract(sin(mod(h + s.x, TAU))*43758.5453), p.x);
    h.xy = mix(h.xz, h.yw, p.y);
    return mix(h.x, h.y, p.z);// Range: [0, 1].
}

// Simple environment mapping
vec3 eMap(vec3 rd, vec3 sn){

    vec3 sRd = rd;// Save rd, just for some mixing at the end.

    // Add a time component, scale, then pass into the noise function.
    rd.xy -= iTime*.25;
    rd *= 3.;

    float c = n3D(rd)*.57 + n3D(rd*2.)*.28 + n3D(rd*4.)*.15;// Noise value.
    c = smoothstep(0.5, 1., c);// Darken and add contast for more of a spotlight look.

    vec3 col = vec3(c, c*c, c*c*c*c);// Simple, warm coloring.
    //vec3 col = vec3(min(c*1.5, 1.), pow(c, 2.5), pow(c, 12.)).zyx; // More color.

    // Mix in some more red to tone it down and return.
    return mix(col, col.zyx, n3D(rd*2.));

}

float hm(vec2 uv){

    vec3 edges = texture(uVoroEdgeBufferTexture, uv).rgb;

    float h = edges.x; // rounded

    objID = smoothstep(0.02, 0.0225, h);

    h *= 51.5;
    float maxHeight = .65;

    float decay = 8.;
    float depressionStart = maxHeight*1.3;
    float depressionDepth = maxHeight;
    float depressionDecay = 2.;
    float depressionBlendWidth = 0.5;


    // flatten the top
    float flattened = maxHeight * (1.0 - exp(-h * decay));
    float depression = 0.;
    if (h > depressionStart) {
        // Create depression starting from depressionStart
        float adjustedHeight = max(0.0, h - depressionStart);
        float blendFactor = smoothstep(depressionStart, depressionStart + depressionBlendWidth, h);
        depression = depressionDepth * (1.0 - exp(-adjustedHeight * depressionDecay)) * blendFactor;
    }

    return flattened - depression;
}

// Back plane height map.
float bpHm(vec3 p, float rmMod) {
    vec2 uv = pToUv(p);
    float h = hm(uv);
    hmGlobal = h;
    //    return -p.z - (h - .5)*rmMod*rmMod;
    return -p.z - (h - 1.)*rmMod*rmMod*rmMod;
}

// normal function
vec3 nr(in vec3 p, float rmMod) {
    // attempt to speed up compiler time by contriving a break
    float sgn = 1.;
    vec3 e = vec3(.0025, 0, 0), mp = e.zzz;// Spalmer's clever zeroing.
    for (int i = 0; i<6; i++){
        mp.x += bpHm(p + sgn*e, rmMod)*sgn;
        sgn = -sgn;
        if ((i&1)==1){ mp = mp.yzx; e = e.zxy; }
    }

    return normalize(mp);
}

void main(){

    aspect = iResolution.x / iResolution.y;

    vec2 u = pCoords();
    vec2 cf = cfCoords();
    cf *= 0.85;// cap center force
    float cfDist = length(u - cf);
    float origCfDist = cfDist;
    cfDist = clamp(cfDist, 0., 1.);
    cfDist = (cfDist + 0.3)/(1.3);
    cfDist *= 0.45;
    float rmMod = clamp(1. - cfDist, 0., 1.);


    vec3 o = vec3(mix(u, cf, rmMod), -1.*rmMod);
    vec3 l = o + vec3(0, 0, 4.5);// light follows camera
    u -= cf;
    vec3 r = normalize(vec3(u, 2));// unit direction ray

    // raymarching routine start
    float d, t = 0.;
    vec3 p;

    t = cfDist; // TODO

    float fIterationsMod = 1.;
    float iterations = BASE_RM_ITERATIONS * fIterationsMod * rmMod;
    float flooredIterations = floor(iterations);
    float iterationsFraction = iterations - flooredIterations;

    float tDelta = 0.;

    float effectiveIterations = 0.;

    for (int i=0; i < int(flooredIterations); i++){
        effectiveIterations++;
        t += tDelta;
        p = o + r * t;
        d = bpHm(p, rmMod);
        if (abs(d) < .01) {
            tDelta = 0.;
            break;
        }
        //        if (objID == 1.) {
        //            tDelta = 0.;
        //            break;
        //        }
        tDelta = d * .28 / fIterationsMod * rmMod;
    }

    if (tDelta > 0.) {
        effectiveIterations += iterationsFraction;
        t += tDelta * iterationsFraction;
        p = o + r * t;
    }
    // raymarching routine end


    float svObjID = objID; // object id
    float svHm = hmGlobal; // height map
    vec3 c = vec3(0);
    vec2 uv = pToUv(p);
    vec3 fCol = vec3(0.05);
    vec3 mCol;
    if (svObjID > 0.) {
        mCol = texture(uMainOutputTexture, uv).rgb;
    }
    c = mix(fCol, mCol, svObjID);

    // normal.
    vec3 n = nr(p, rmMod);

    l -= p; // light direction vector.
    float lDist = max(length(l), .001); // light to surface distance
    l /= lDist; // normalizing the light direction vector


    #if BACKFILL_LIGHT == 1
    // backfill light
    float backFill = max(dot(vec3(-l.xy, 0.), n), 0.);
    float ns0 = n3D(p*3. + iTime/4.);
    ns0 = smoothstep(-.25, .25, ns0 - .5);
    c += c*mix(vec3(1, .05, .0), vec3(1, .1, .2), ns0*.5)*backFill*64.*rmMod*rmMod*rmMod;
    // faux fresnel edge glow
    float fres = pow(max(1. - max(dot(-r, n), 0.), 0.), 4.);
    c += c*vec3(0, .3, 1)*fres*5.*rmMod*rmMod*rmMod;
    #endif


    // Sspecular reflections
    vec3 hv = normalize(-r + l);
    vec3 ref = reflect(r, n);
    // hacky env mapping
    vec3 tx2 = eMap(ref, n);
    float specR = pow(max(dot(hv, n), 0.), 8.);
    c += specR*tx2*2.;

    if (svObjID < 1.) {
        // faux shadowing
        float shade = svHm + .02;
        c *= min(vec3(pow(shade, .8))*1.6, 1.);
        // alternative
        //c *= smoothstep(0., .55, svHm)*.8 + .2;
    }


    //float ambience = pow(length(sin(n*2.)*.45 + .5), 2.);
    float ambience = length(sin(n*2.)*.5 + .5)/sqrt(3.)*smoothstep(-1., 1., -n.z)*1.5;

    //            float matType = svHm<.45? 0. : 1.;// Dialectric or metallic.
    //            c *= 1. + matType;// Brighter metallic colors.

    c = pow(c*ambience, vec3(1./1.3));



    outputColor = vec4(c, 1.);
    voroIndexBufferColor = fetchIndices(uv);
}