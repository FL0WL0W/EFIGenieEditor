export function downloadBin(data, fileName) {
    var blob, url
    blob = new Blob([data], {
      type: `application/octet-stream`
    })
    url = window.URL.createObjectURL(blob)
    downloadURL(url, fileName)
    setTimeout(function() {
      return window.URL.revokeObjectURL(url)
    }, 1000)
}

export function downloadObject(obj, fileName) {
    downloadstring(JSON.stringify(obj), fileName)
}

function downloadstring(text, fileName) {
    var blob, url
    blob = new Blob([text], { 
        type: `text/plain` 
    })
    url = window.URL.createObjectURL(blob)
    downloadURL(url, fileName)
    setTimeout(function() {
      return window.URL.revokeObjectURL(url)
    }, 1000)
}
  
function downloadURL(data, fileName) {
    var a
    a = document.createElement(`a`)
    a.href = data
    a.download = fileName
    document.body.appendChild(a)
    a.style = `display: none`
    a.click()
    a.remove()
}