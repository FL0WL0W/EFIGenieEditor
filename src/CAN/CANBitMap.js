// A view of the existing configuration list; it never participates in serialization.
export function mountCANBitMap(message, list) {
    const map = document.createElement(`div`)
    map.className = `can-bit-map`
    map.setAttribute(`role`, `group`)
    map.setAttribute(`aria-label`, `CAN payload bit map`)
    const interactionRoot = message.closest(`.can-message-layout`) ?? message
    interactionRoot.prepend(map)
    const tooltip = document.createElement(`span`)
    tooltip.className = `can-bit-tooltip`
    tooltip.hidden = true
    tooltip.setAttribute(`role`, `tooltip`)

    let fields = []
    let segments = new Map()
    let labels = new Map()
    let hovered
    let focused
    let frame
    let labelFrame
    const fitLabels = () => {
        labelFrame = undefined
        labels.forEach((field, label) => {
            label.textContent = field.name
            label.style.fontSize = ``
        })
        const measurements = [...labels].map(([label, field]) => ({
            label,
            field,
            available: label.parentElement.clientWidth,
            width: label.getBoundingClientRect().width
        }))
        measurements.forEach(({ label, field, available, width }) => {
            if(width > available)
                label.textContent = field.index + 1
        })
        // Even a single-bit field should show its complete configuration index.
        const indices = measurements.filter(({ available, width }) => width > available)
            .map(({ label, available }) => ({ label, available, width: label.getBoundingClientRect().width,
                fontSize: parseFloat(getComputedStyle(label).fontSize) }))
        indices.forEach(({ label, available, width, fontSize }) => {
            if(width > available && available > 0)
                label.style.fontSize = `${fontSize * available / width}px`
        })
    }
    const labelObserver = new ResizeObserver(() => {
        if(labelFrame === undefined)
            labelFrame = requestAnimationFrame(fitLabels)
    })
    labelObserver.observe(map)
    const highlight = () => {
        const active = hovered ?? focused
        fields.forEach(field => {
            field.item.classList.toggle(`can-field-highlight`, field.item === active)
        })
        segments.forEach((item, segment) => {
            segment.classList.toggle(`can-field-highlight`, item === active)
        })
        const field = fields.find(field => field.item === active)
        tooltip.hidden = !field
        tooltip.textContent = field ? `${field.name} · ${field.length === 1 ? `Bit ${field.start}` : `Bits ${field.start}–${field.start + field.length - 1}`}` : ``
    }
    const fieldAt = target => {
        if(!(target instanceof Element))
            return
        const segment = target.closest(`.can-bit-field`)
        if(segments.has(segment))
            return segments.get(segment)
        return fields.find(field => field.row.contains(target))?.item
    }
    const onPointer = event => {
        if(event.type === `pointerout` && !interactionRoot.contains(event.relatedTarget))
            pointer.x = pointer.y = -1
        hovered = fieldAt(event.type === `pointerout` ? event.relatedTarget : event.target)
        highlight()
    }
    const onFocus = event => {
        focused = fieldAt(event.type === `focusout` ? event.relatedTarget : event.target)
        highlight()
    }
    const render = () => {
        frame = undefined
        const nextFields = [...list.children].filter(row => row.item).map((row, index) => ({
            row,
            item: row.item,
            name: row.item.name.value?.trim() || `Field ${index + 1}`,
            start: Number(row.item.bitLocation.value),
            length: Number(row.item.variable?.SubConfig?.constructor?.bitLength ?? row.item.bitLength.value),
            color: `hsl(${(index * 137.508 + 205) % 360} 55% 70%)`,
            index
        }))
        // Scaling and live-value changes do not alter the map. Keep its focused
        // elements intact and avoid rebuilding the view for those changes.
        if(map.hasChildNodes() && nextFields.length === fields.length && nextFields.every((field, index) =>
            [`row`, `name`, `start`, `length`].every(key => Object.is(field[key], fields[index][key]))))
            return
        fields.forEach(field => {
            field.item.classList.remove(`can-field-highlight`)
            field.item.name.style.removeProperty(`--can-field-color`)
        })
        fields = nextFields
        fields.forEach(field => field.item.name.style.setProperty(`--can-field-color`, field.color))
        segments = new Map()
        labels = new Map()
        const content = document.createDocumentFragment()
        const axis = document.createElement(`div`)
        axis.className = `can-bit-axis`
        axis.setAttribute(`aria-hidden`, `true`)
        for(let bit = 0; bit <= 64; bit += 8) {
            const marker = document.createElement(`span`)
            marker.textContent = bit
            marker.style.left = `${bit / 64 * 100}%`
            axis.append(marker)
        }
        content.append(axis)
        const lanes = [[]]
        fields.forEach(field => {
            if(!Number.isInteger(field.start) || !Number.isInteger(field.length) || field.length < 1)
                return
            const low = Math.max(0, field.start)
            const high = Math.min(63, field.start + field.length - 1)
            if(low > high)
                return
            let lane = lanes.find(lane => lane.every(segment => high < segment.low || low > segment.high))
            if(!lane) {
                lane = []
                lanes.push(lane)
            }
            lane.push({ field, low, high })
        })
        lanes.forEach(lane => {
            const track = document.createElement(`div`)
            track.className = `can-bit-track`
            track.title = `CAN payload: offsets 0–63, left to right`
            lane.sort((a, b) => a.low - b.low)
            lane.forEach(({ field, low, high }) => {
                const cell = document.createElement(`span`)
                cell.style.gridColumn = `${low + 1} / span ${high - low + 1}`
                cell.className = `can-bit-field`
                cell.tabIndex = 0
                const label = document.createElement(`span`)
                label.className = `can-bit-label`
                label.textContent = field.name
                cell.append(label)
                labels.set(label, field)
                cell.title = `${field.name}: bits ${field.start + field.length - 1}:${field.start} (${field.length} ${field.length === 1 ? `bit` : `bits`})`
                cell.setAttribute(`aria-label`, cell.title)
                cell.style.setProperty(`--can-field-color`, field.color)
                segments.set(cell, field.item)
                track.append(cell)
            })
            content.append(track)
        })
        map.replaceChildren(content, tooltip)
        if(labelFrame !== undefined)
            cancelAnimationFrame(labelFrame)
        fitLabels()
        // A removed/replaced row must not leave a highlight behind.
        hovered = fieldAt(document.elementFromPoint(pointer.x, pointer.y))
        focused = fieldAt(document.activeElement)
        highlight()
    }
    const pointer = { x: -1, y: -1 }
    const onMove = event => { pointer.x = event.clientX; pointer.y = event.clientY }
    const scheduleRender = () => {
        if(frame === undefined)
            frame = requestAnimationFrame(render)
    }
    interactionRoot.addEventListener(`pointermove`, onMove)
    interactionRoot.addEventListener(`pointerover`, onPointer)
    interactionRoot.addEventListener(`pointerout`, onPointer)
    interactionRoot.addEventListener(`focusin`, onFocus)
    interactionRoot.addEventListener(`focusout`, onFocus)
    list.addEventListener(`change`, scheduleRender)
    render()
    return () => {
        if(frame !== undefined)
            cancelAnimationFrame(frame)
        if(labelFrame !== undefined)
            cancelAnimationFrame(labelFrame)
        labelObserver.disconnect()
        interactionRoot.removeEventListener(`pointermove`, onMove)
        interactionRoot.removeEventListener(`pointerover`, onPointer)
        interactionRoot.removeEventListener(`pointerout`, onPointer)
        interactionRoot.removeEventListener(`focusin`, onFocus)
        interactionRoot.removeEventListener(`focusout`, onFocus)
        list.removeEventListener(`change`, scheduleRender)
        fields.forEach(field => {
            field.item.classList.remove(`can-field-highlight`)
            field.item.name.style.removeProperty(`--can-field-color`)
        })
        map.remove()
    }
}
