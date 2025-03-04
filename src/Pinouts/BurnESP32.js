import pako from "pako"

export async function BurnESP32(cfg, type){
    const saveValue = JSON.stringify(cfg.saveValue)
    const bin = buildConfig({ ...cfg.value, type: type })

    //save config to ESP32
    const compressedData = pako.gzip(new TextEncoder().encode(saveValue))
    let xhr = new XMLHttpRequest()
    xhr.open(`POST`, `/upload/config.json.gz`, true)
    xhr.setRequestHeader(`Content-Type`, `application/octet-stream`) // Indicating raw binary data
    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                alert("Saved Configuration to Device")
            } else {
                alert("Saved Configuration to Browser")
            }
        }
    };
    xhr.send(compressedData)

    xhr = new XMLHttpRequest()
    xhr.open(`POST`, `/upload/config.bin`, true)
    xhr.setRequestHeader(`Content-Type`, `application/octet-stream`) // Indicating raw binary data
    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                xhr = new XMLHttpRequest()
                xhr.open(`POST`, `/command/reset`, true)
                xhr.send()
                alert("Saved Binary to Device")
                window.location.reload()
            }
        }
    };
    xhr.send(bin)
}