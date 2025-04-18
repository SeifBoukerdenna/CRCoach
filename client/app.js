(async () => {
    const video = document.getElementById("video");
    const btn = document.getElementById("start");
    const status = document.getElementById("status");
    const resEl = document.getElementById("resolution");
    const fpsEl = document.getElementById("fps");
    const rttEl = document.getElementById("rtt");

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // update status
    pc.onconnectionstatechange = () => {
        status.innerText = "Status: " + pc.connectionState;
    };

    // prepare to recv only video
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.ontrack = ({ streams }) => {
        video.srcObject = streams[0];
        video.onloadedmetadata = () => {
            resEl.innerText = `${video.videoWidth}×${video.videoHeight}`;
            startFPS();
        };
    };

    // measure RTT once per second
    setInterval(async () => {
        const stats = await pc.getStats();
        stats.forEach(report => {
            if (
                report.type === "candidate-pair" &&
                report.state === "succeeded" &&
                report.currentRoundTripTime
            ) {
                rttEl.innerText = `${Math.round(report.currentRoundTripTime * 1000)} ms`;
            }
        });
    }, 1000);

    // compute FPS locally
    let lastT = performance.now(), frames = 0;
    function startFPS() {
        function loop() {
            frames++;
            const now = performance.now(), dt = now - lastT;
            if (dt >= 1000) {
                fpsEl.innerText = `${Math.round((frames / dt) * 1000)} FPS`;
                frames = 0;
                lastT = now;
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    // button click → negotiate
    btn.onclick = async () => {
        status.innerText = "Status: creating…";
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        status.innerText = "Status: gathering ICE…";
        await new Promise(r => {
            pc.onicecandidate = e => {
                if (!e.candidate) r();
            };
            // fallback
            setTimeout(r, 3000);
        });

        status.innerText = "Status: sending…";
        const res = await fetch("/offer", {
            method: "POST",
            body: JSON.stringify(pc.localDescription),
            headers: { "Content-Type": "application/json" }
        });
        const ans = await res.json();
        await pc.setRemoteDescription(ans);
    };
})();
