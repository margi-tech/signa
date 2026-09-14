
import React from "react";
import handUp from "./hand-up.png";

export default function HandZ() {
    return (
        <div style={styles.wrapper}>
            <svg
                viewBox="0 0 680 340"
                style={styles.svg}
                role="img"
                aria-label="Animație literă Z"
            >
                <path
                    d="M40,40 L640,40 L40,300 L640,300"
                    fill="none"
                    stroke="#c9c9c9"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                />

                <g className="hand-z">
                    <image
                        href={handUp}
                        x="9"
                        y="-5"
                        width="86.8"
                        height="126"
                    />
                </g>
            </svg>

            <style>{`

@keyframes zmove {
    0% {
        transform: translate(0px, 0px);
    }

    33.33% {
        transform: translate(600px, 0px);
    }

    66.66% {
        transform: translate(0px, 260px);
    }

    100% {
        transform: translate(600px, 260px);
    }
}

.hand-z {
    animation: zmove 3s linear infinite;
}


@media (prefers-reduced-motion: reduce) {
.hand-z {
        animation: none;
    }
}
`}</style>
        </div>
    );
}

const styles = {
    wrapper: {
        width: "100%",
        maxWidth: 680,
    },

    svg: {
        width: "100%",
        height: "auto",
        display: "block",
    },
};

