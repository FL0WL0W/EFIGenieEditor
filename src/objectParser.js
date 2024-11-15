import lzjs from "./lzjs"

export function stringifyObject(o) {
    return JSON.stringify(o)
}
export function stringifyCompressedObject(o) {
    return `lzjson${lzjs.compress(JSON.stringify(o))}`
}

export function parseObject(s) {
    if(s.indexOf(`lzjson`) === 0)
        return JSON.parse(lzjs.decompress(s.substring(6)))
    return JSON.parse(s)
}
