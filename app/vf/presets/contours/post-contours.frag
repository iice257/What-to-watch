#version 300 es

precision highp float;
precision highp int;

uniform sampler2D uMainOutputTexture;
uniform sampler2D uVoroEdgeBufferTexture;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

uniform vec3 iResolution;
uniform float iTime;
uniform vec3 fBaseColor;
uniform float fEdge0;
uniform float fEdgeScale;

in vec2 vUv;
out vec4 fragColor;

float objID = 0.; // 0. = frame, 1. = media
vec2 mediaUv;

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

float bump(vec2 uv) {

    vec4 v = texture(uVoroEdgeBufferTexture, uv);
    float b = v.r; // custom edge value

//    b*=2.;

    mediaUv = v.ba;
    float scaleMod = v.g;
//    scaleMod *= 5.;
//    scaleMod *= 5.;
//    scaleMod = clamp(scaleMod, 0.35, 10.75);
    scaleMod = 1./inversesqrt(scaleMod);
    scaleMod = clamp(scaleMod, 0., 0.3);


    b/=fEdgeScale;

    float edge0 = (fEdge0/fEdgeScale)*scaleMod;
//    float edge1 = edge0*0.6;
    float edge1 = edge0*1.1;
    float edge2 = edge1+0.025*scaleMod;

    objID = smoothstep(edge1, edge2, b);

    // contoured border.
    if (b < edge0) {
        b = abs(b - edge0*2.)/edge0*2.; // normalize domain to a range of zero to one
//        b = smoothstep(0., .25, b)/4. + clamp(-cos(b*6.283*1.5) - .5, 0., 1.); // add the contoured pattern to the frame
        b = smoothstep(0., .075, b)/16. + clamp(-cos(b*6.283*1.5) - .5, 0., 1.); // add the contoured pattern to the frame
//        b = smoothstep(0., 0.1, b)/16. + smoothstep(0.3, 0.7, clamp(-cos(b*6.283*1.5) - .5, 0., 1.));
//        b = smoothstep(0., 0.12, b)/20. + smoothstep(0.2, 0.8, clamp(-cos(b*6.283*1.2) - .3, 0., 1.));

//        b = smoothstep(0., .075, b)/16. + clamp(-cos(b*6.283*1.3) - .5, 0., 1.); // add the contoured pattern to the frame

//        // A sprinkling of noise.
//        vec3 tx = texture(iChannel1, vUv*2.).xyz;
//        //tx *= tx;
//        float gr = dot(tx, vec3(.299, .587, .114));
//        //float gr = hash22(floor(p.xy*32.)/32.).x;
//        b *= (1. + gr*.01);
    } else {
//        b = 0.1;
//        b = (b - edge0)/(1. - edge0); // Normalize the domain to a range of zero to one.
//        b = clamp(b + cos(b*6.283*24.)*.002, 0., 1.); // Add some ridges.
    }

//    objID = smoothstep(0.5, 0.6, b);
//    objID = smoothstep(0.7, 0.75, b);


    // A sprinkling of noise.
    vec3 tx = texture(iChannel1, mediaUv*2.).xyz;
    //tx *= tx;
    float gr = dot(tx, vec3(.299, .587, .114));
    //float gr = hash22(floor(p.xy*32.)/32.).x;
//    b *= (1. + gr*.01);
    b *= (1. + gr*.0025*(1./b));

    return b;
}

void main(){
    vec2 p = pCoords();
    vec2 uv = vUv;

    float c = bump(uv); // voronoi edges

//    fragColor = vec4(vec3(c), 1);
//    return;



    float svObjID = objID;
    vec2 svMediaUv = mediaUv;

    vec3 mediaCol;
    vec3 webCol;
    if (svObjID>0.) {
        mediaCol = texture(uMainOutputTexture, uv).rgb;
    }

//    if (svObjID<1.) {

//        vec2 customUv = uv * 64.;
        vec2 customUv = uv * 4.;


        // bump mapping & edging
        vec2 e = vec2(2./iResolution.y, 0);// sample spred, reduce the sample spread from "8./iResolution.y" to reduce artifacts on the webbing portion
//        vec2 e = vec2(0.5/iResolution.y, 0);// sample spred, reduce the sample spread from "8./iResolution.y" to reduce artifacts on the webbing portion

        float bf = .4;// Bump factor.
        float fx = (bump(uv - e) - bump(uv + e)); // horizontal samples
        float fy = (bump(uv - e.yx) - bump(uv + e.yx)); // vertical samples
        float edge = abs(c*2. - fx) + abs(c*2. - fy); // edge value


        // TEXTURE AND COLORING.
        // Texture sample with fake height information added.
        vec3 n = normalize(vec3(fx, fy, -e.x/bf));// Bumped normal.
        vec3 tx = texture(iChannel0, (svMediaUv + n.xy*.125)*.25).xyz;
//        vec3 tx = texture(iChannel0, (customUv)).xyz;
        tx *= tx;// sRGB to linear.
        tx = smoothstep(0., .5, tx);// Accentuating the color a bit.

        // Object color. Initialize to the texture value.
        //    vec3 oCol = tx *fBaseColor;
        vec3 oCol = tx *.15;
        //    vec3 oCol = fBaseColor;

//        col = mix(oCol, baseCol.rgb, svObjID);

//        oCol *= vec3(1.2, .8, .4); // Uncomment for gold webbing.


        //oCol *= vec3(1.2, 1, .84); // Warmer coloring.
        //oCol *= vec3(.9, 1.1, 1.3); // Cooler coloring.


        // LIGHTING.
        //

        // 3D screen hit point. Just a flat plane at the zero point on the Z-axix.
        vec3 sp = vec3(p, 0.);

        // Two lights, set back from the plane, and rotating about the XY plane on
        // opposite sides of an ellipse, or something to that effect.
        vec3 lp = sp + vec3(-.3*sin(iTime/2.), .2*cos(iTime/2.), -.5);
        vec3 lp2 = sp + vec3(.3*sin(iTime/2.), -.2*cos(iTime/2.), -.5);
        //    vec3 lp = sp + vec3(-0.3, .3*cos(iTime/2.), -.5);
        //    vec3 lp2 = sp + vec3(0.3, .2, -.5);

        // Fake hit-point height value. Normally, you'd cast a ray to the hit point, but
        // since it's a simple bump mapped example, we're estimating it.
        sp.z -= c*.1;
        vec3 r = normalize(vec3(p, 1.));// unit direction ray

        float lDist = length(lp - sp);// Light distance one.
        float atten = 1./(1. + lDist*lDist*.5);// Light one attenuation.
        vec3 l = (lp - sp)/max(lDist, .001);// Light one direction (normalized).
        float diff = max(max(dot(l, n), 0.), 0.);// Diffuse value one.
        float spec = pow(max(dot(reflect(l, n), r), 0.), 64.);// Specular value one.


        float lDist2 = length(lp2 - sp);// Light distance two.
        float atten2 = 1./(1. + lDist2*lDist2*.5);// Light two attenuation.
        vec3 l2 = (lp2 - sp)/max(lDist2, .001);// Light two direction (normalized).
        float diff2 = max(max(dot(l2, n), 0.), 0.);// Diffuse value two.
        float spec2 = pow(max(dot(reflect(l2, n), r), 0.), 64.);// Specular value twp.

        // Ramping up the power and increasing the intensity of the diffuse values to
        // give more of a metallic look.
        diff = pow(diff, 4.)*2.;
        diff2 = pow(diff2, 4.)*2.;


        // Combining the texture and lighting information above.


        // Light one.
        webCol = oCol;
        webCol *= (diff*vec3(.5, .7, 1) + .25 + vec3(.25, .5, 1)*spec*32.)*atten*.5;

        // Adding light two.
        webCol += oCol*(diff2*vec3(1, .7, .5) + .25 + vec3(1, .3, .1)*spec2*32.)*atten2*.5;

        // Apply the edging. This provides fake AO, depth information, etc.
        webCol *= edge;

        webCol = sqrt(max(webCol, 0.));
//    }


    vec3 mediaCol2 = mediaCol;
    mediaCol2 *= (diff*vec3(.5, .7, 1) + .25 + vec3(.25, .5, 1)*spec*32.)*atten*.5;

    // Adding light two.
    mediaCol2 += mediaCol*(diff2*vec3(1, .7, .5) + .25 + vec3(1, .3, .1)*spec2*32.)*atten2*.5;

    // Apply the edging. This provides fake AO, depth information, etc.
//    mediaCol2 *= edge;

//    mediaCol2 = sqrt(max(mediaCol2, 0.));
    mediaCol = mediaCol2;


    vec3 col = mix(webCol, mediaCol, svObjID);

    fragColor = vec4(col, 1);
}