# Particle, Sky and Fog Shaders

The three "non-surface" processor shaders. Each has a distinct model —
don't write them like vertex/fragment shaders.

## Particle process shaders — `shader_type particles;`

Used by `GPUParticles2D`/`GPUParticles3D` via a `ShaderMaterial` in the
*Process Material* slot. They compute per-particle **state on the GPU**;
they do not draw — the draw pass uses the particle's mesh/texture and
its own (optional) spatial/canvas_item shader.

Two functions:

- `start()` — runs once when a particle is (re)emitted: set initial
  `TRANSFORM`, `VELOCITY`, `COLOR`, `CUSTOM`.
- `process()` — runs every frame: integrate motion, fade, etc.

Key built-ins: `TRANSFORM` (mat4 — position in `TRANSFORM[3].xyz`),
`VELOCITY`, `COLOR`, `CUSTOM` (vec4 scratch, e.g. lifetime/anim frame),
`LIFETIME`, `DELTA`, `TIME`, `RESTART` (bool — true on the frame a
particle restarts), `ACTIVE`, `EMISSION_TRANSFORM`, `NUMBER`,
`INDEX`, `RANDOM_SEED`.

```glsl
shader_type particles;
uniform float gravity = -9.8;

// No built-in RNG in particle shaders: hash the uint seeds yourself
// (same hash the converted ParticleProcessMaterial code uses).
uint hash(uint x) {
    x = ((x >> 16u) ^ x) * 73244475u;
    x = ((x >> 16u) ^ x) * 73244475u;
    return (x >> 16u) ^ x;
}
float rand01(uint seed) { return float(hash(seed) % 65536u) / 65535.0; }

void start() {
    TRANSFORM[3].xyz = EMISSION_TRANSFORM[3].xyz;
    VELOCITY = vec3(rand01(NUMBER + RANDOM_SEED) - 0.5, 4.0, 0.0);
    COLOR = vec4(1.0);
    CUSTOM.y = 0.0;                          // normalised age
}
void process() {
    VELOCITY.y += gravity * DELTA;
    TRANSFORM[3].xyz += VELOCITY * DELTA;
    CUSTOM.y += DELTA / LIFETIME;            // 0 -> 1 over the lifetime
    COLOR.a = clamp(1.0 - CUSTOM.y, 0.0, 1.0);   // fade out
}
```

`RANDOM_SEED`, `NUMBER` and `INDEX` are `uint` — never mix them into
float maths without an explicit `float()` cast (no implicit conversion).

Use `CUSTOM.y` to drive sprite-sheet animation or pass a value to the
draw shader. Collision needs the particles node's *Collision* mode plus
collider nodes in the scene — `GPUParticlesCollisionSphere3D`/`Box3D`/
`SDF3D`/`HeightField3D` in 3D, `LightOccluder2D` for `GPUParticles2D` —
that's node config (`godot-development`), not shader code. In
`process()` you can react via `COLLIDED`, `COLLISION_NORMAL`,
`COLLISION_DEPTH`.

## Sky shaders — `shader_type sky;`

Set on a `Sky` resource's `ShaderMaterial`, used by `WorldEnvironment`.
One function: `sky()`. Built-ins: `EYEDIR` (view direction, the main
input), `SKY_COORDS`, `LIGHT0_ENABLED`/`LIGHT0_DIRECTION`/
`LIGHT0_COLOR`/`LIGHT0_ENERGY` (up to LIGHT3 — your DirectionalLights),
`POSITION`, `TIME`, `HALF_RES_COLOR`/`QUARTER_RES_COLOR` (for cheaper
multi-pass), `AT_CUBEMAP_PASS`/`AT_HALF_RES_PASS`/`AT_QUARTER_RES_PASS`.
Write `COLOR`:

```glsl
shader_type sky;
uniform vec4 top : source_color; uniform vec4 horizon : source_color;
void sky() {
    float t = clamp(EYEDIR.y * 0.5 + 0.5, 0.0, 1.0);
    COLOR = mix(horizon.rgb, top.rgb, t);
}
```

Use the `*_RES_PASS` flags to do expensive work (clouds) at lower
resolution. Sky contributes to ambient/reflection, so keep it
physically sane if PBR relies on it.

## Fog shaders — `shader_type fog;`

Set on a `FogMaterial` for `FogVolume` nodes (volumetric fog must be
enabled in the `Environment`). One function: `fog()`. Built-ins include
`WORLD_POSITION`, `OBJECT_POSITION`, `UVW`, `SDF`, `SIZE`, `TIME`;
outputs `DENSITY` (the important one), `ALBEDO`, `EMISSION`.

```glsl
shader_type fog;
uniform float density = 1.0;
void fog() {
    DENSITY = density;               // clamp/shape by UVW for soft edges
    ALBEDO = vec3(0.8, 0.85, 1.0);
}
```

`DENSITY` is per-froxel; modulate it with noise (`NoiseTexture3D`) for
rolling fog. Volumetric fog is Forward+ only.

Boundary: enabling volumetric fog/glow in `WorldEnvironment`,
configuring the particle node's emission shape, lifetime and draw passes
→ `godot-development`.
