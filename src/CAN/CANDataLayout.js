const layoutSelector = `.can-parse-layout, .can-pack-layout, .can-message-layout`
const pendingLayouts = new Set()
const naturalBitWidths = new WeakMap()
let layoutFrame

// Share one frame and batch measurements before changing rows. Applying changes outside
// the observer callback avoids resize feedback when wrapping changes the row height.
const layoutObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
        const layout = entry.target.closest(layoutSelector)
        if(layout)
            pendingLayouts.add(layout)
    })
    if(layoutFrame !== undefined)
        return
    layoutFrame = requestAnimationFrame(() => {
        layoutFrame = undefined
        const layouts = [...pendingLayouts]
        pendingLayouts.clear()
        const updates = layouts.map(layout => {
            if(!layout.isConnected)
                return
            const width = layout.getBoundingClientRect().width
            if(width === 0)
                return
            if(layout.classList.contains(`can-message-layout`)) {
                const settings = layout.querySelector(`.can-message-settings-content`)
                const selection = layout.parentElement.selection
                if(!settings || !selection)
                    return
                const layoutRect = layout.getBoundingClientRect()
                const settingsRect = settings.getBoundingClientRect()
                const selectionRect = selection.getBoundingClientRect()
                const selector = selection.parameterSelection.selectedElement.getBoundingClientRect()
                const lastControl = settings.lastElementChild
                const control = (lastControl.selectedElement ?? lastControl).getBoundingClientRect()
                return {
                    layout,
                    prefix: `can-message`,
                    wrapped: selectionRect.right - layoutRect.left + settingsRect.width > width + 0.5,
                    headingWidth: selector.right - layoutRect.left + settingsRect.right - control.right
                }
            }
            const prefix = layout.classList.contains(`can-parse-layout`) ? `can-parse` : `can-pack`
            const ownElements = selector => [...layout.querySelectorAll(selector)]
                .filter(element => element.closest(layoutSelector) === layout)
            const headerWidth = ownElements(`.${prefix}-label, .${prefix}-unit, .${prefix}-live`)
                .reduce((sum, element) => sum + element.getBoundingClientRect().width, 0)
            const isAligned = layout.classList.contains(`${prefix}-aligned`)
            const measurements = ownElements(`.${prefix}-field-group`).map(group => [...group.children].map(element => {
                const style = getComputedStyle(element)
                if(style.display === `none`)
                    return { width: 0, outerWidth: 0 }
                const elementWidth = element.getBoundingClientRect().width
                let naturalWidth = elementWidth
                if(element.matches(`.canBitOffset, .canBitLength`)) {
                    if(!isAligned)
                        naturalBitWidths.set(element, elementWidth)
                    naturalWidth = naturalBitWidths.get(element) ?? elementWidth
                }
                return {
                    width: elementWidth,
                    outerWidth: naturalWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0)
                }
            }))
            // Enlarging aligned inputs must not shift the original breakpoints.
            const groupWidths = measurements.map(group => group.reduce((sum, element) => sum + element.outerWidth, 0))
            const fieldsWidth = groupWidths.reduce((sum, groupWidth) => sum + groupWidth, 0)
            return {
                layout,
                prefix,
                wrapped: headerWidth + fieldsWidth > width + 0.5,
                aligned: groupWidths[1] > 0 && fieldsWidth > width + 0.5,
                firstLabelWidth: Math.max(...measurements.map(group => group[0].width)),
                secondLabelWidth: Math.max(...measurements.map(group => group[2].width))
            }
        })
        updates.forEach(update => {
            if(!update)
                return
            if(update.prefix === `can-message`) {
                update.layout.style.setProperty(`--can-message-heading-width`, `${update.headingWidth}px`)
                update.layout.classList.toggle(`can-message-wrapped`, update.wrapped)
                return
            }
            update.layout.style.setProperty(`--can-data-first-label-width`, `${update.firstLabelWidth}px`)
            update.layout.style.setProperty(`--can-data-second-label-width`, `${update.secondLabelWidth}px`)
            if(update.prefix === `can-parse`)
                update.layout.classList.toggle(`can-parse-wrapped`, update.wrapped)
            update.layout.classList.toggle(`${update.prefix}-aligned`, update.aligned)
        })
    })
})

export function observeCANDataLayout(element) {
    const layout = element.querySelector(layoutSelector)
    const observed = [layout, ...layout.querySelectorAll(`.can-parse-label, .can-parse-unit, .can-parse-live, .can-parse-field-group, .can-pack-field-group`)]
        .filter(target => target.closest(layoutSelector) === layout)
    observed.forEach(target => layoutObserver.observe(target))
    return () => {
        observed.forEach(target => layoutObserver.unobserve(target))
        pendingLayouts.delete(layout)
    }
}

export function observeCANMessageLayout(element) {
    const layout = element.closest(`.can-message-layout`)
    if(!layout)
        return () => {}
    const observed = [layout, layout.parentElement.selection, layout.parentElement.name.parentElement,
        element.querySelector(`.can-message-settings-content`)]
    observed.forEach(target => layoutObserver.observe(target))
    return () => {
        observed.forEach(target => layoutObserver.unobserve(target))
        pendingLayouts.delete(layout)
    }
}
