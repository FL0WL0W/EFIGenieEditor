import UIButton from "../JavascriptUI/UIButton"
import UIDialog from "../JavascriptUI/UIDialog"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import UIGauge from "../UI/UIGauge"
import UIUnit, { ConvertValueFromUnitToUnit, GetMeasurementNameFromUnitName } from "../UI/UIUnit"
import { defaultFilter } from "../VariableRegistry"
import { communication } from "../communication"
import { objectTester } from "../JavascriptUI/UIUtils"
import UIPlot from "../UI/UIPlot"
import { downloadObject } from "../download"
import { throttle } from 'lodash-es'
import defaultDashboardViews from "./DefaultDashboardViews.json"

class UILoggedVariable extends HTMLTableRowElement {
    #variable
    get variable() { return this.#variable }
    set variable(variable) {
        this.#variable = variable
        this.children[0].textContent = variable?.name == undefined? `--`: variable.name.substring(variable.name.lastIndexOf(`.`) + 1) ?? `--`
        this.children[2].textContent = variable?.unit ?? `--`
        this.children[3].textContent = variable?.refreshRate? (variable.refreshRate == -1? `Max` : `${variable.refreshRate}Hz`) : `--`
    }
    get unit() { return this.#variable?.unit }
    set unit(unit) {
        if(this.variable == undefined) return
        this.variable = { ...this.variable, unit }
    }
    get refreshRate() { return this.#variable?.refreshRate }
    set refreshRate(refreshRate) {
        if(this.variable == undefined) return
        this.variable = { ...this.variable, refreshRate }
    }
    #value
    get value() { return this.#value }
    set value(value) {
        this.#value = value
        let displayValue = `--`
        if(typeof value === `number`) {
            displayValue = `${parseFloat(parseFloat(parseFloat(value).toFixed(5)).toPrecision(6))}`
            const indexOfPoint = displayValue.indexOf(`.`)
            let zeroesToAdd = Math.max(0, 6-(displayValue.length - indexOfPoint))
            if(indexOfPoint === -1) zeroesToAdd = 6
            if(zeroesToAdd < (this.ZeroesToAdd ?? Infinity)) this.ZeroesToAdd = zeroesToAdd
            zeroesToAdd -= this.ZeroesToAdd
            if(zeroesToAdd > 0 && indexOfPoint < 0) displayValue += `.`
            for(let i = 0; i < zeroesToAdd; i++) displayValue += `0`
        } else if(typeof value === `boolean`) {
            displayValue = value? `true` : `false`
        }
        this.children[1].minWidth = Math.max(this.children[1].minWidth ?? 0, `${displayValue}`.length)
        this.children[1].style.minWidth = `${this.children[1].minWidth}ch`
        this.children[1].textContent = displayValue
    }

    constructor() {
        super()
        this.appendChild(document.createElement(`td`)).class = `loggedVariableName`
        this.append(document.createElement(`td`), document.createElement(`td`), document.createElement(`td`))
        this.appendChild(document.createElement(`td`)).class = `actions`
        this.value = undefined
    }
}
customElements.define(`ui-loggedvariable`, UILoggedVariable, { extends: `tr` })

export default class Dashboard extends UITemplate {
    static thisDashboard
    static storageKey = `EFIGenie.dashboard.layouts.v1`
    static template =
`<div class="dashboard-shell">
    <div class="dashboard-toolbar">
        <div data-element="viewTabs"></div>
        <div data-element="addView"></div>
        <div class="dashboard-toolbar-spacer"></div>
        <div data-element="addGauge"></div>
        <div data-element="addPlot"></div>
        <div data-element="layoutUploadInput"></div>
    </div>
    <div data-element="elements"></div>
    <div class="dashboard-logger">
        <div class="loggedVariables">
            <div data-element="loggedVariables"></div>
        </div>
        <div data-element="expandSidebar"></div>
    </div>
</div>`

    elements = document.createElement(`div`)
    viewTabs = document.createElement(`div`)
    addView = new UIButton({ label: `+ View` })
    addGauge = new UIButton({ label: `+ Gauge` })
    addPlot = new UIButton({ label: `+ Plot` })
    layoutUploadInput = document.createElement(`input`)
    loggedVariables = document.createElement(`table`)
    loggedVariablesUnitSelection = new UIUnit()
    loggedVariablesRefreshSelection = new UISelection({
        class: `refreshRateSelection`, selectHidden: true,
        options: [
            { name: `0.5Hz`, value: 0.5 }, { name: `1Hz`, value: 1 },
            { name: `10Hz`, value: 10 }, { name: `30Hz`, value: 30 },
            { name: `60Hz`, value: 60 }, { name: `100Hz`, value: 100 },
            { name: `Max`, value: -1 },
        ]
    })
    loggedVariableVariableSelection = new UISelection({ selectHidden: true })
    loggedVariableVariableSelectionDialog = new UIDialog({ title: `Variables` })
    expandSidebar = new UIButton({label:`Logged Variables`, class: `loggedVariablesExpand`})

    #layoutDocument
    #activeViewId
    #saveLayoutTimer
    #loggedVariableAddRow

    get options() { return this.loggedVariableVariableSelection.options }
    set options(options) {
        if(objectTester(this.loggedVariableVariableSelection.options, options)) return
        this.loggedVariableVariableSelection.options = options
        this.dispatchEvent(new Event(`change`))
    }

    // Logging choices belong to the tune. Dashboard presentation deliberately does not.
    get saveValue() { return { loggedVariables: this.loggedVariables.saveValue ?? [] } }
    set saveValue(saveValue) {
        this.loggedVariables.saveValue = saveValue?.loggedVariables ?? []
        this.RefreshOptions()
    }
    get value() { return { loggedVariables: this.loggedVariables.variables ?? [] } }
    set value(value) { this.saveValue = value }

    constructor(prop) {
        super()
        Dashboard.thisDashboard = this
        this.elements.className = `dashboard-canvas`
        this.viewTabs.className = `dashboard-view-tabs`
        this.layoutUploadInput.type = `file`
        this.layoutUploadInput.accept = `.json,application/json`
        this.layoutUploadInput.hidden = true

        this.#setupLoggedVariables()
        this.Setup(prop)
        this.#setupDashboardControls()
        this.#loadLayouts()

        communication.addEventListener(`change`, ({ detail }) => {
            this.#updateLoggedValues(detail.currentVariableValues, detail.variableMetadata)
            this.RefreshOptions()
        })
        this.addEventListener(`playback`, ({ detail }) => this.#updateLoggedValues(detail.values, communication.variableMetadata))
        const refreshListener = throttle(this.RefreshOptions.bind(this), 100)
        VariableRegister.addEventListener(`change`, refreshListener)
        communication.variableMetadata.addEventListener(`change`, refreshListener)
    }

    Setup(prop) {
        super.Setup(prop)
        this.sidebar = this.querySelector(`.loggedVariables`)
        this.sidebar.hidden = true
        this.expandSidebar.label = ` + Logged Variables `
    }

    #setupLoggedVariables() {
        this.loggedVariablesUnitSelection.classList.remove(`unit`)
        this.loggedVariablesUnitSelection.classList.add(`logged-variable-selection`)
        this.loggedVariablesRefreshSelection.classList.add(`logged-variable-selection`)
        const restoreSelectedRow = () => {
            const row = this.loggedVariables.querySelector(`tr.selected`)
            if(!(row instanceof UILoggedVariable)) return
            row.classList.remove(`selected`)
            row.variable = row.variable
        }
        this.loggedVariablesUnitSelection.contextMenu.addEventListener(`close`, restoreSelectedRow)
        this.loggedVariablesRefreshSelection.contextMenu.addEventListener(`close`, restoreSelectedRow)
        this.loggedVariableVariableSelectionDialog.content.appendChild(this.loggedVariableVariableSelection.contextMenu).class = `opened`
        this.loggedVariableVariableSelection.addEventListener(`change`, () => {
            this.loggedVariables.saveValue = [ ...this.loggedVariables.saveValue,  { ...this.loggedVariableVariableSelection.value, refreshRate: 60 } ]
            communication.variablesToPoll = []
            this.RefreshOptions()
            this.dispatchEvent(new Event(`change`, { bubbles: true }))
        })

        const header = this.loggedVariables.appendChild(document.createElement(`tr`))
        const name = header.appendChild(document.createElement(`td`))
        name.textContent = `Name`
        name.class = `loggedVariableName`
        header.appendChild(document.createElement(`td`)).textContent = `Value`
        header.appendChild(document.createElement(`td`)).textContent = `Unit`
        header.appendChild(document.createElement(`td`)).textContent = `Refresh`
        const actions = header.appendChild(document.createElement(`td`))
        actions.class = `actions`
        const headerAdd = actions.appendChild(document.createElement(`div`))
        headerAdd.className = `controladd`
        headerAdd.addEventListener(`click`, () => this.loggedVariableVariableSelectionDialog.show())

        const addRow = this.loggedVariables.appendChild(document.createElement(`tr`))
        addRow.className = `logged-variable-add-row`
        this.#loggedVariableAddRow = addRow
        addRow.appendChild(document.createElement(`td`)).className = `loggedVariableName`
        addRow.append(document.createElement(`td`), document.createElement(`td`), document.createElement(`td`))
        const addActions = addRow.appendChild(document.createElement(`td`))
        addActions.className = `actions`
        const btnAdd = addActions.appendChild(document.createElement(`div`))
        btnAdd.class = `controladd`
        btnAdd.addEventListener(`click`, () => this.loggedVariableVariableSelectionDialog.show())

        const thisClass = this
        this.loggedVariables.tabIndex = 0
        this.loggedVariables.addEventListener(`keydown`, event => {
            if(event.key !== `Delete`) return
            const selectedRow = this.loggedVariables.querySelector(`.selected`)
            if(selectedRow) this.#removeLoggedRow(selectedRow)
        })
        let draggedRow
        let dragImage
        let rowMoved = false
        this.loggedVariables.addEventListener(`dragstart`, event => {
            const row = event.target.closest(`tr`)
            const cell = event.target.closest(`td`)
            if(!(row instanceof UILoggedVariable) || !cell || cell.cellIndex > 1) {
                event.preventDefault()
                return
            }
            draggedRow = row
            rowMoved = false
            row.classList.add(`logged-variable-dragging`)
            event.dataTransfer.effectAllowed = `move`
            event.dataTransfer.setData(`text/plain`, row.variable?.name ?? ``)
            // Chromium uses the entire table as the native drag image for a
            // customized <tr>. The row itself already moves as the pointer is
            // dragged, so suppress that misleading full-sidebar preview.
            dragImage = document.createElement(`canvas`)
            dragImage.width = 1
            dragImage.height = 1
            dragImage.style.position = `fixed`
            dragImage.style.left = `-10px`
            dragImage.style.top = `-10px`
            document.body.appendChild(dragImage)
            event.dataTransfer.setDragImage(dragImage, 0, 0)
        })
        this.loggedVariables.addEventListener(`dragover`, event => {
            if(!draggedRow) return
            const target = event.target.closest(`tr`)
            if(!(target instanceof UILoggedVariable) || target === draggedRow) return
            event.preventDefault()
            event.dataTransfer.dropEffect = `move`
            const insertAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2
            const before = insertAfter? target.nextSibling : target
            if(before !== draggedRow) {
                this.loggedVariables.insertBefore(draggedRow, before)
                rowMoved = true
            }
        })
        this.loggedVariables.addEventListener(`drop`, event => {
            if(draggedRow) event.preventDefault()
        })
        this.loggedVariables.addEventListener(`dragend`, () => {
            if(!draggedRow) return
            dragImage?.remove()
            dragImage = undefined
            draggedRow.classList.remove(`logged-variable-dragging`)
            draggedRow = undefined
            if(!rowMoved) return
            communication.variablesToPoll = []
            this.RefreshOptions()
            this.dispatchEvent(new Event(`change`, { bubbles: true }))
        })
        Object.defineProperty(this.loggedVariables, 'saveValue', {
            get: function() { return this.variables },
            set: function(saveValue) { this.variables = saveValue ?? [] }
        })
        Object.defineProperty(this.loggedVariables, 'variables', {
            get: function() { return [...this.children].filter(row => row instanceof UILoggedVariable).map(row => row.variable) },
            set: function(variables) {
                variables ??= []
                this.querySelectorAll(`.logged-variable-required`).forEach(row => row.remove())
                let rows = [...this.children].filter(row => row instanceof UILoggedVariable)
                while(rows.length > variables.length) {
                    this.removeChild(rows.pop())
                }
                for(let i = 0; i < variables.length; i++) {
                    if(!rows[i]) {
                        const row = this.insertBefore(new UILoggedVariable(), addRow)
                        row.children[0].draggable = true
                        row.children[1].draggable = true
                        rows.push(row)
                        const btnDelete = document.createElement(`div`)
                        btnDelete.className = `controldelete`
                        row.children[4].replaceChildren(btnDelete)
                        btnDelete.addEventListener(`click`, event => {
                            event.stopPropagation()
                            thisClass.#removeLoggedRow(row)
                        })
                        row.addEventListener(`click`, event => {
                            const clickedCell = event.target.closest(`td`)
                            const unitClicked = clickedCell === row.children[2]
                            const refreshClicked = clickedCell === row.children[3]
                            if(!unitClicked && !refreshClicked) return
                            const clickedExistingSelection = event.target.closest(`.logged-variable-selection`)
                            // The selection itself has already handled this
                            // click. The document click handler will close it.
                            if(clickedExistingSelection) return

                            // Only one inline editor may be open at a time.
                            thisClass.loggedVariablesUnitSelection.contextMenu.hide()
                            thisClass.loggedVariablesRefreshSelection.contextMenu.hide()

                            const previousRow = this.querySelector(`tr.selected`)
                            if(previousRow && previousRow !== row) {
                                previousRow.classList.remove(`selected`)
                                // Restore the text displaced by the shared
                                // unit and refresh selection controls.
                                previousRow.variable = previousRow.variable
                            }
                            ;[...this.children].forEach(child => child.classList.remove(`selected`))
                            row.classList.add(`selected`)
                            if(row.variable == undefined) return
                            thisClass.loggedVariablesRefreshSelection.value = row.refreshRate
                            thisClass.loggedVariablesUnitSelection.measurement = GetMeasurementNameFromUnitName(row.unit)
                            thisClass.loggedVariablesUnitSelection.value = row.unit
                            const selection = unitClicked?
                                thisClass.loggedVariablesUnitSelection :
                                thisClass.loggedVariablesRefreshSelection
                            clickedCell.replaceChildren(selection)
                            selection.children[0].dispatchEvent(new Event(`click`))
                            window.setTimeout(() => {
                                if(!selection.contextMenu.visible) restoreSelectedRow()
                            }, 2)
                        })
                    }
                    rows[i].variable = variables[i]
                }
            }
        })
        this.loggedVariablesRefreshSelection.addEventListener(`change`, () => {
            const row = this.loggedVariables.querySelector(`.selected`)
            if(!row) return
            row.refreshRate = this.loggedVariablesRefreshSelection.value
            communication.variablesToPoll = []
            this.dispatchEvent(new Event(`change`, { bubbles: true }))
        })
        this.loggedVariablesUnitSelection.addEventListener(`change`, () => {
            const row = this.loggedVariables.querySelector(`.selected`)
            if(!row) return
            row.unit = this.loggedVariablesUnitSelection.value
            this.dispatchEvent(new Event(`change`, { bubbles: true }))
        })
    }

    #removeLoggedRow(row) {
        this.loggedVariables.removeChild(row)
        communication.variablesToPoll = []
        this.RefreshOptions()
        this.dispatchEvent(new Event(`change`, { bubbles: true }))
    }

    #setupDashboardControls() {
        this.expandSidebar.addEventListener(`click`, () => {
            if(this.sidebar.hidden) {
                this.sidebar.hidden = false
                this.expandSidebar.label = ` - Logged Variables `
            } else {
                this.sidebar.hidden = true
                this.expandSidebar.label = ` + Logged Variables`
            }
        })
        this.addGauge.addEventListener(`click`, () => this.#addWidget({ type: `gauge` }, true))
        this.addPlot.addEventListener(`click`, () => this.#addWidget({ type: `plot` }, true))
        this.addView.addEventListener(`click`, () => {
            this.#captureActiveView()
            const view = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: `View ${this.#layoutDocument.views.length + 1}`, elements: [] }
            this.#layoutDocument.views.push(view)
            this.#activateView(view.id)
        })
        this.layoutUploadInput.addEventListener(`change`, event => {
            const file = event.target.files?.[0]
            if(!file) return
            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const document = JSON.parse(reader.result)
                    // Accept the current single-view format, a bare view, and
                    // older multi-view exports without replacing local views.
                    const imported = document?.view ??
                        (Array.isArray(document?.views)?
                            document.views.find(view => view.id === document.activeViewId) ?? document.views[0] :
                            document)
                    if(!imported || !Array.isArray(imported.elements)) throw new Error(`No dashboard view found`)
                    const baseName = `${imported.name ?? `Imported View`}`
                    let name = baseName
                    let suffix = 2
                    while(this.#layoutDocument.views.some(view => view.name === name))
                        name = `${baseName} (${suffix++})`
                    const view = {
                        ...imported,
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        name,
                        elements: structuredClone(imported.elements)
                    }
                    this.#captureActiveView()
                    this.#layoutDocument.views.push(view)
                    this.#activateView(view.id)
                } catch(error) {
                    alert(`Unable to load dashboard view: ${error.message}`)
                }
            }
            reader.readAsText(file)
            event.target.value = ``
        })
    }

    downloadView() {
        this.#captureActiveView()
        const view = this.#activeView()
        const filename = `${view.name ?? `Dashboard-View`}`.replace(/[^a-z0-9._-]+/gi, `-`)
        downloadObject({ version: 1, view: structuredClone(view) }, `EFIGenie-${filename}.json`)
    }

    uploadView() {
        this.layoutUploadInput.click()
    }

    #loadLayouts() {
        try { this.#layoutDocument = JSON.parse(localStorage.getItem(Dashboard.storageKey)) } catch { }
        if(!Array.isArray(this.#layoutDocument?.views) || this.#layoutDocument.views.length === 0) {
            this.#layoutDocument = structuredClone(defaultDashboardViews)
        }
        this.#activeViewId = this.#layoutDocument.activeViewId ?? this.#layoutDocument.views[0].id
        this.#activateView(this.#activeViewId)
    }

    #activeView() { return this.#layoutDocument.views.find(x => x.id === this.#activeViewId) ?? this.#layoutDocument.views[0] }

    #activateView(id) {
        if(this.#activeViewId && this.#activeViewId !== id) this.#captureActiveView()
        this.#activeViewId = id
        this.#layoutDocument.activeViewId = id
        this.elements.replaceChildren()
        for(const element of this.#activeView().elements ?? []) this.#addWidget(element, false)
        this.#renderViewTabs()
        this.#saveLayouts()
    }

    #renderViewTabs() {
        this.viewTabs.replaceChildren()
        for(const view of this.#layoutDocument.views) {
            const tab = new UIButton({ label: view.name, class: view.id === this.#activeViewId? `dashboard-view-tab active` : `dashboard-view-tab` })
            tab.title = `Double-click to rename`
            tab.addEventListener(`click`, () => this.#activateView(view.id))
            tab.addEventListener(`dblclick`, () => {
                const name = prompt(`View name`, view.name)
                if(name?.trim()) {
                    view.name = name.trim()
                    this.#renderViewTabs()
                    this.#saveLayouts()
                }
            })
            if(this.#layoutDocument.views.length > 1) {
                const remove = new UIButton({ label: `×`, class: `dashboard-view-remove` })
                remove.title = `Delete ${view.name}`
                remove.addEventListener(`click`, event => {
                    event.stopPropagation()
                    if(!window.confirm(`Delete dashboard view "${view.name}"?`)) return
                    this.#deleteView(view.id)
                })
                tab.append(remove)
            }
            this.viewTabs.append(tab)
        }
    }

    #deleteView(id) {
        if(this.#layoutDocument.views.length <= 1) return
        const index = this.#layoutDocument.views.findIndex(view => view.id === id)
        if(index === -1) return
        const deletingActiveView = id === this.#activeViewId
        if(!deletingActiveView) this.#captureActiveView()
        this.#layoutDocument.views.splice(index, 1)
        if(deletingActiveView) {
            const nextView = this.#layoutDocument.views[Math.min(index, this.#layoutDocument.views.length - 1)]
            this.#activeViewId = undefined
            this.#activateView(nextView.id)
        } else {
            this.#renderViewTabs()
            this.#saveLayouts()
        }
    }

    #addWidget(saved = {}, persist = true) {
        const type = saved.type === `plot`? `plot` : `gauge`
        const widget = document.createElement(`div`)
        widget.className = `dashboard-widget dashboard-${type}`
        widget.dataset.type = type
        const remove = new UIButton({ label: `×`, class: `dashboard-widget-remove` })
        const content = type === `plot`? new UIPlot() : new UIGauge()
        content.classList.add(`dashboard-widget-content`)
        content.style.display = `block`
        content.style.width = `100%`
        content.style.height = `100%`
        widget.append(content, remove)
        content.saveValue = saved
        const gaugeCanvas = type === `gauge`? content.querySelector(`canvas`) : undefined
        const gaugeWidth = parseFloat(gaugeCanvas?.style.width) || parseFloat(gaugeCanvas?.dataset.width) || gaugeCanvas?.width
        const gaugeHeight = parseFloat(gaugeCanvas?.style.height) || parseFloat(gaugeCanvas?.dataset.height) || gaugeCanvas?.height
        const width = type === `plot`? parseFloat(saved.width) || 800 : gaugeWidth
        const height = type === `plot`? parseFloat(saved.height) || 430 : gaugeHeight
        const position = saved.left !== undefined && saved.top !== undefined?
            { left: parseFloat(saved.left) || 0, top: parseFloat(saved.top) || 0 } :
            this.#findOpenPosition(width, height)
        widget.style.left = `${position.left}px`
        widget.style.top = `${position.top}px`
        widget.style.width = `${width}px`
        widget.style.height = `${height}px`
        this.elements.append(widget)
        this.#installWidgetDrag(widget)
        remove.addEventListener(`click`, event => {
            event.stopPropagation()
            widget.remove()
            this.#refreshRequiredLoggedVariables()
            this.#scheduleLayoutSave()
        })
        content.addEventListener(`change`, () => {
            if(type === `gauge`) {
                const canvas = content.querySelector(`canvas`)
                const canvasWidth = parseFloat(canvas?.style.width) || parseFloat(canvas?.dataset.width) || canvas?.width
                const canvasHeight = parseFloat(canvas?.style.height) || parseFloat(canvas?.dataset.height) || canvas?.height
                if(canvasWidth) widget.style.width = `${canvasWidth}px`
                if(canvasHeight) widget.style.height = `${canvasHeight}px`
                this.#updateCanvasHeight()
            }
            this.#refreshRequiredLoggedVariables()
            this.#scheduleLayoutSave()
        })
        if(type === `plot`) {
            const observer = new ResizeObserver(() => {
                content.Resize?.()
                this.#scheduleLayoutSave()
            })
            observer.observe(widget)
        }
        this.#updateCanvasHeight()
        this.#refreshRequiredLoggedVariables()
        if(persist) this.#scheduleLayoutSave()
        return widget
    }

    #findOpenPosition(width, height) {
        const grid = 25
        const occupied = [...this.elements.children].map(widget => ({
            left: widget.offsetLeft,
            top: widget.offsetTop,
            right: widget.offsetLeft + widget.offsetWidth,
            bottom: widget.offsetTop + widget.offsetHeight,
        }))
        const availableWidth = Math.max(grid, this.elements.clientWidth)
        const lastX = Math.max(0, Math.floor((availableWidth - width) / grid) * grid)
        const occupiedBottom = Math.max(0, ...occupied.map(rect => rect.bottom))
        const lastY = Math.ceil((occupiedBottom + height) / grid) * grid
        const overlaps = (left, top) => occupied.some(rect =>
            left < rect.right && left + width > rect.left &&
            top < rect.bottom && top + height > rect.top)

        for(let top = 0; top <= lastY; top += grid) {
            for(let left = 0; left <= lastX; left += grid) {
                if(!overlaps(left, top)) return { left, top }
            }
        }
        return { left: 0, top: Math.ceil(occupiedBottom / grid) * grid }
    }

    #installWidgetDrag(widget) {
        widget.addEventListener(`pointerdown`, event => {
            if(event.target.closest(`.dashboard-widget-remove`)) return
            const bounds = widget.getBoundingClientRect()
            if(widget.classList.contains(`dashboard-plot`) &&
                event.clientX >= bounds.right - 20 && event.clientY >= bounds.bottom - 20) {
                const finishResize = () => {
                    document.removeEventListener(`pointerup`, finishResize)
                    widget.style.width = `${Math.max(250, Math.round(widget.offsetWidth / 25) * 25)}px`
                    widget.style.height = `${Math.max(250, Math.round(widget.offsetHeight / 25) * 25)}px`
                    widget.querySelector(`.dashboard-widget-content`)?.Resize?.()
                    this.#updateCanvasHeight()
                    this.#scheduleLayoutSave()
                }
                document.addEventListener(`pointerup`, finishResize)
                return
            }
            event.preventDefault()
            const startX = event.clientX
            const startY = event.clientY
            const startLeft = widget.offsetLeft
            const startTop = widget.offsetTop
            let moved = false
            const move = moveEvent => {
                const dx = moveEvent.clientX - startX
                const dy = moveEvent.clientY - startY
                if(!moved && Math.hypot(dx, dy) < 8) return
                moved = true
                const grid = 25
                widget.classList.add(`dragging`)
                widget.style.left = `${Math.max(0, Math.round((startLeft + dx) / grid) * grid)}px`
                widget.style.top = `${Math.max(0, Math.round((startTop + dy) / grid) * grid)}px`
                this.#updateCanvasHeight()
            }
            const up = () => {
                document.removeEventListener(`pointermove`, move)
                document.removeEventListener(`pointerup`, up)
                widget.classList.remove(`dragging`)
                if(moved) {
                    const suppressClick = clickEvent => {
                        clickEvent.preventDefault()
                        clickEvent.stopImmediatePropagation()
                        document.removeEventListener(`click`, suppressClick, true)
                    }
                    document.addEventListener(`click`, suppressClick, true)
                    this.#scheduleLayoutSave()
                }
            }
            document.addEventListener(`pointermove`, move)
            document.addEventListener(`pointerup`, up)
        })
    }

    #serializeWidgets() {
        return [...this.elements.children].map(widget => {
            const content = widget.querySelector(`.dashboard-widget-content`)
            const serialized = { ...content.saveValue, type: widget.dataset.type,
                left: parseFloat(widget.style.left) || 0, top: parseFloat(widget.style.top) || 0 }
            if(widget.dataset.type === `plot`) {
                serialized.width = parseFloat(widget.style.width) || widget.offsetWidth
                serialized.height = parseFloat(widget.style.height) || widget.offsetHeight
            }
            return serialized
        })
    }

    #captureActiveView() {
        const view = this.#activeView()
        if(view) view.elements = this.#serializeWidgets()
    }

    #scheduleLayoutSave() {
        clearTimeout(this.#saveLayoutTimer)
        this.#saveLayoutTimer = setTimeout(() => {
            this.#captureActiveView()
            this.#saveLayouts()
        }, 100)
    }

    #saveLayouts() {
        localStorage.setItem(Dashboard.storageKey, JSON.stringify(this.#layoutDocument))
        this.#updateCanvasHeight()
    }

    #updateCanvasHeight() {
        const bottom = Math.max(500, ...[...this.elements.children].map(x => x.offsetTop + x.offsetHeight + 25))
        this.elements.style.setProperty(`--dashboard-content-height`, `${bottom}px`)
    }

    ShowPlaybackRecord(values, time, index) {
        this.dispatchEvent(new CustomEvent(`playback`, { detail: { values, time, index } }))
    }

    IsVariableAvailable(reference) {
        return this.ResolveVariable(reference, VariableRegister) !== undefined ||
            this.ResolveVariable(reference, communication.variableMetadata) !== undefined
    }

    ResolveVariable(reference, registry) {
        if(!reference?.name) return
        const measurement = reference.measurement ?? GetMeasurementNameFromUnitName(reference.unit)
        return registry.GetVariableByReference({ name: reference.name, measurement })
    }

    #updateLoggedValues(values, metadata) {
        ;[...this.loggedVariables.children].filter(row => row instanceof UILoggedVariable).forEach(row => {
            const variable = this.ResolveVariable(row.variable, metadata)
            if(!variable) {
                row.value = undefined
                return
            }
            if(communication.variablesToPoll.indexOf(variable.id) === -1) communication.variablesToPoll.push(variable.id)
            if(values?.[variable.id] === undefined) return
            const converted = ConvertValueFromUnitToUnit(values[variable.id], variable.unit, row.unit)
            row.value = converted ?? values[variable.id]
        })
    }

    RefreshOptions() {
        const match = (a, b) => a?.name == b?.name &&
            (a?.unit == undefined || b?.unit == undefined || GetMeasurementNameFromUnitName(a?.unit) === GetMeasurementNameFromUnitName(b?.unit))
        let options = VariableRegister.GetSelections(undefined, defaultFilter(undefined, [`float|bool|enum`]), false)
        const metadataOptions = communication.variableMetadata.GetSelections(undefined, defaultFilter(undefined, [`float|bool|enum`]), false)
        for(const option of metadataOptions) {
            if(option.group) {
                const group = options.find(x => x.group === option.group)
                if(!group) options.push(option)
                else for(const child of option.options) if(!group.options.find(x => objectTester(x.value, child.value))) group.options.push(child)
            } else if(!options.find(x => objectTester(x.value, option.value))) options.push(option)
        }
        const used = [...this.loggedVariables.children].filter(row => row instanceof UILoggedVariable).map(x => x.variable)
        options = options.map(option => option.group? {
            ...option, options: option.options.map(child => ({ ...child, disabled: used.some(variable => match(child.value, variable)) }))
        } : { ...option, disabled: used.some(variable => match(option.value, variable)) })
        this.options = options
        ;[...this.loggedVariables.children].filter(row => row instanceof UILoggedVariable).forEach(row => {
            const available = this.IsVariableAvailable(row.variable)
            row.classList.toggle(`unavailable`, !available)
            if(!available) row.value = undefined
        })
        this.#refreshRequiredLoggedVariables()
        for(const widget of this.elements.children) widget.querySelector(`.dashboard-widget-content`)?.RefreshAvailability?.()
    }

    #refreshRequiredLoggedVariables() {
        if(!this.#loggedVariableAddRow) return
        this.loggedVariables.querySelectorAll(`.logged-variable-required, .logged-variable-separator`).forEach(row => row.remove())

        const match = (a, b) => a?.name === b?.name &&
            (a?.unit === undefined || b?.unit === undefined ||
                GetMeasurementNameFromUnitName(a.unit) === GetMeasurementNameFromUnitName(b.unit))
        const logged = [...this.loggedVariables.children]
            .filter(row => row instanceof UILoggedVariable)
            .map(row => row.variable)
        const required = []
        for(const widget of this.elements.children) {
            const content = widget.querySelector(`.dashboard-widget-content`)
            const references = widget.dataset.type === `plot`?
                [...(content?.variablesToPlot?.children ?? [])].map(row => row.item.variable.value) :
                [content?.configTemplate?.variable?.value]
            for(const reference of references) {
                if(!reference?.name || logged.some(variable => match(variable, reference)) ||
                    required.some(item => match(item.reference, reference))) continue
                required.push({ reference, addable: this.IsVariableAvailable(reference) })
            }
        }
        required.sort((a, b) => Number(b.addable) - Number(a.addable))

        if(required.length > 0) {
            const separator = document.createElement(`tr`)
            separator.className = `logged-variable-separator`
            const cell = separator.appendChild(document.createElement(`td`))
            cell.colSpan = 5
            this.loggedVariables.insertBefore(separator, this.#loggedVariableAddRow)
        }

        for(const { reference, addable } of required) {
            const row = document.createElement(`tr`)
            row.className = `logged-variable-required ${addable? `addable` : `unavailable`}`
            row.title = addable? `Required by a dashboard widget; click + to log it` : `Required by a dashboard widget but unavailable`
            const name = row.appendChild(document.createElement(`td`))
            name.className = `loggedVariableName`
            name.textContent = reference.name.substring(reference.name.lastIndexOf(`.`) + 1)
            row.appendChild(document.createElement(`td`)).textContent = `--`
            row.appendChild(document.createElement(`td`)).textContent = reference.unit ?? `--`
            row.appendChild(document.createElement(`td`)).textContent = `--`
            const actions = row.appendChild(document.createElement(`td`))
            actions.className = `actions`
            if(addable) {
                const add = actions.appendChild(document.createElement(`div`))
                add.className = `controladd`
                add.addEventListener(`click`, event => {
                    event.stopPropagation()
                    this.loggedVariables.saveValue = [
                        ...this.loggedVariables.saveValue,
                        { ...reference, refreshRate: 60 }
                    ]
                    communication.variablesToPoll = []
                    this.RefreshOptions()
                    this.dispatchEvent(new Event(`change`, { bubbles: true }))
                })
            }
            this.loggedVariables.insertBefore(row, this.#loggedVariableAddRow)
        }
    }
}

customElements.define(`top-dashboard`, Dashboard, { extends: `span` })
