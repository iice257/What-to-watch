#version 300 es

precision highp float;
precision highp int;

uniform sampler2D uMainOutputTexture;
uniform sampler2D uVoroEdgeBufferTexture;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

uniform vec3 iResolution;
uniform float iTime;
uniform float fGrayscaleMod;

in vec2 vUv;
out vec4 fragColor;

#define PI 3.141592

float objID = 0.;// 0. = frame, 1. = media
float scaleMod;

float cheapSqrt(float a) {
    return 1./inversesqrt(a);
}

float resolutionScale;
void initResolutionScale() {
    resolutionScale = cheapSqrt(length(iResolution.xy) / 1000.0);
}

void initGlobals() {
    initResolutionScale();
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
    return gl_FragCoord.xy / iResolution.z;
}

vec2 normalizedPCoords() {
    return normalizeCoords(fragCoords());
}

vec2 pCoords() {
    return aspectCoords(fragCoords());
}

const vec3 GRAYSCALE_LUMCOEFF = vec3(0.2125, 0.7154, 0.0721);
const vec4 GRAYSCALE_DUOTONE_DARK = vec4(0.125, 0.125, 0.133, 1);
const vec4 GRAYSCALE_DUOTONE_LIGHT = vec4(0.769, 0.729, 0.69, 1);

vec3 linearToGamma(in vec3 value, in float factor) {
    return vec3(pow(value.xyz, vec3(1.0 / factor)));
}

vec3 gammaToLinear(in vec3 value, in float factor) {
    return vec3(pow(value.xyz, vec3(factor)));
}

#define GAMMA_CONVERSION_FACTOR 2

vec3 toGrayscale(vec3 c, float factor) {
    c = linearToGamma(c, float(GAMMA_CONVERSION_FACTOR));
    vec3 gray = vec3(dot(GRAYSCALE_LUMCOEFF, c));
    vec3 duotone = mix(GRAYSCALE_DUOTONE_DARK.rgb, GRAYSCALE_DUOTONE_LIGHT.rgb, gray);
    c = mix(c, duotone, factor);
    c = gammaToLinear(c, float(GAMMA_CONVERSION_FACTOR));
    return c;
}

vec4 bump(vec2 uv) {
    vec4 v = texture(uVoroEdgeBufferTexture, uv);
    float b = v.r;// rounded edge value

    vec2 mediaUv = v.ba;
    scaleMod = v.g;

    float mediaScaleMod = 1./inversesqrt(scaleMod);

    float edge0 = 0.09*mediaScaleMod;
    float edge1 = edge0+0.035*mediaScaleMod;
    objID = smoothstep(edge0, edge1, b);

    float c = sin(PI*1.9+abs(b-0.04));

    vec3 tx = texture(iChannel1, mediaUv*1.5).xyz;
    tx *= tx;
    float gr = dot(tx, vec3(.299, .587, .114));
    c *= (1. + gr*.05);

    return vec4(c, b, mediaUv);
}

vec3 bumpedNormal(vec2 uv, vec4 data, float scaleMod) {
    float customScale = scaleMod * 4.;
    vec2 e = vec2(resolutionScale * 0.0055 * customScale, 0.); // sample spred
    vec3 n = normalize(vec3(
        bump(uv+e).x-bump(uv-e).x,
        0.2,
        bump(uv+e.yx).x-bump(uv-e.yx).x
    ));
    return n;

}

void main(){
    initGlobals();

    vec2 p = pCoords();
    vec2 uv = vUv;

    vec4 data = bump(uv);// voronoi edges + more

    float svObjID = objID;
    float svScaleMod = scaleMod;
    vec2 mediaUv = data.zw;

    vec3 mediaCol;
    vec3 webCol;

    if (svObjID<1.) {

        webCol = 0.5+0.5*sin(vec3(0., 2., 2.99)/1.5+ data.x*PI*5.-0.2);
        webCol *= 0.8;

        vec3 n = bumpedNormal(uv, data, scaleMod);

        //    float lTime = iTime;
        //    float lTime = 0.;

        vec3 rd = normalize(vec3(uv, -1.));
        //light 1 position
        vec3 light = vec3(1., 1., 4.);
        // vec3 light = vec3(1.*sin(lTime), 1.*cos(lTime), 4.);
        //light 1 direction vector using uv and voronoi height for surface point
        vec3 ldir = normalize(light-vec3(uv.x, data.x, uv.y));
        //light2
        vec3 light2 = vec3(1., 2., 4.);
        // vec3 light2 = vec3(1.*sin(lTime), 2.*cos(lTime), 4.);
        vec3 ldir2 = normalize(light2-vec3(uv.x, data.x, uv.y));

        //phong lighting diffuse and specular for light 1
        float diff = max(dot(ldir, n), 0.);
        float spec = pow(max(dot(reflect(-ldir, n), rd), 0.), 10.);
        webCol += diff*0.3+vec3(0.8, 0.5, 0.3)*spec*0.8;

        //and for light 2
        float diff2 = max(dot(ldir, n), 0.);
        float spec2 = pow(max(dot(reflect(-ldir2, n), rd), 0.), 10.);
        webCol += diff2*0.3+vec3(0.1, 0.5, 0.9)*spec2*0.8;

        webCol = mix(webCol, pow(webCol.r*1.4, 3.2)*vec3(0.14, 0.09, 0.05), smoothstep(0.085, 0.05, data.y));
        webCol= pow(webCol, vec3(2.));
    }

    if (svObjID>0.) {
        mediaCol = texture(uMainOutputTexture, uv).rgb;
    }

    vec3 col = mix(webCol, mediaCol, svObjID);
    col = toGrayscale(col, fGrayscaleMod);
    fragColor = vec4(col, 1);
}