export function getCANBaseBytes(value, fields = []) {
    const bytes = Array.from({ length: 8 }, (_, index) => {
        const byte = value?.[index]
        return Number.isInteger(byte) && byte >= 0 && byte <= 255 ? byte : 0
    })
    // The firmware ORs packed values into the base. Clear each configured range
    // first so the field can replace base bits, including writing a zero.
    fields.forEach(field => {
        if(!Number.isInteger(field.bitLocation) || !Number.isInteger(field.bitLength))
            return
        for(let bit = Math.max(0, field.bitLocation); bit < Math.min(64, field.bitLocation + field.bitLength); bit++)
            bytes[Math.floor(bit / 8)] &= ~(1 << (7 - bit % 8))
    })
    return bytes
}
