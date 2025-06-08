import * as THREE from 'three';

export namespace FrameTransforms {

    /**
     * Build the transformation from Earth-fixed (ECEF) frame to the satellite's
     * local RSW (Radial, Along-track, Cross-track) frame.
     *
     * @param gmstRad Greenwich mean sidereal time in radians.
     * @param rECI    Position of the reference satellite in the ECI frame.
     * @param vECI    Velocity of the reference satellite in the ECI frame.
     * @returns       3x3, 4x4 matrices and quaternion expressing ECEF -> RSW.
     */
    export function ecefToRsw(
        gmstRad: number,
        rECI: THREE.Vector3,
        vECI: THREE.Vector3
    ) {
        // --- 1. ECI -> RSW basis vectors ---
        const Rhat = rECI.clone().normalize();            // +R (inward)
        const What = rECI.clone().cross(vECI).normalize(); // +W
        const Shat = What.clone().cross(Rhat);             // +S

        const Te2r = new THREE.Matrix3().set(
            Rhat.x, Rhat.y, Rhat.z,
            Shat.x, Shat.y, Shat.z,
            What.x, What.y, What.z
        ); // ECI -> RSW

        // --- 2. ECI <-> ECEF rotation ---
        const c = Math.cos(gmstRad), s = Math.sin(gmstRad);
        const Re2f = new THREE.Matrix3().set(  c,  s, 0,
                                            -s,  c, 0,
                                             0,  0, 1 ); // ECI -> ECEF
        const Rf2e = Re2f.clone().transpose();             // ECEF -> ECI

        // --- 3. Compose (ECEF -> RSW) ---
        const Tf2r = Te2r.clone().multiply(Rf2e);          // RSW <- ECEF

        // --- 4. Convert to Matrix4 and Quaternion ---
        const m4 = new THREE.Matrix4().set(
            Tf2r.elements[0], Tf2r.elements[3], Tf2r.elements[6], 0,
            Tf2r.elements[1], Tf2r.elements[4], Tf2r.elements[7], 0,
            Tf2r.elements[2], Tf2r.elements[5], Tf2r.elements[8], 0,
            0,                 0,                 0,              1
        );
        const q = new THREE.Quaternion().setFromRotationMatrix(m4);
        return { m3: Tf2r, m4, q };
    }

    /**
     * Constant transform from RSW (physics) to Three.js coordinates.
     * RSW axes:  +R (inward), +S (along-track), +W (cross-track)
     * Three.js:  +X (right), +Y (up), +Z (out of screen)
     */
    export const rswToThree = new THREE.Matrix4().set(
        /* row 1 */ 0, 0, 1, 0,   // W -> +X
        /* row 2 */-1, 0, 0, 0,   // R -> -Y
        /* row 3 */ 0,-1, 0, 0,   // S -> -Z
        /* row 4 */ 0, 0, 0, 1
    );
}
