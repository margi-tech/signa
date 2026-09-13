// HandT2.jsx
import React from "react";
import ShakeHand from "./ShakeHand";
import signT from "./sign-T.png"; // sau altă imagine, dacă Ț are gest diferit

export default function HandT2() {
    return <ShakeHand image={signT} label="Ț" />;
}