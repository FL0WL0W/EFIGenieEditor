import UIButton from "../JavascriptUI/UIButton"
import UIDialog from "../JavascriptUI/UIDialog"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import UIGauge from "../UI/UIGauge"
import UIUnit, { GetMeasurementNameFromUnitName } from "../UI/UIUnit"
import { defaultFilter } from "../VariableRegistry"
import { communication } from "../communication"
import { objectTester } from "../JavascriptUI/UIUtils"
import UIPlot from "../UI/UIPlot"
import generateGUID from "../GUID"
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
        const variable = this.variable
        if(variable == undefined)
            return
        this.variable = { ...variable, unit }
    }
    get refreshRate() { return this.#variable?.refreshRate }
    set refreshRate(refreshRate) {
        const variable = this.variable
        if(variable == undefined)
            return
        this.variable = { ...variable, refreshRate }
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
            if(zeroesToAdd < this.ZeroesToAdd) this.ZeroesToAdd = zeroesToAdd
            zeroesToAdd -= this.ZeroesToAdd
            if(zeroesToAdd > 0 && indexOfPoint < 0) displayValue += `.`
            for(let i = 0; i < zeroesToAdd; i++) displayValue += `0`
        } else if(typeof value === `boolean`) {
            if(value)
                displayValue = `true`
            else
                displayValue = `false`
        }

        this.children[1].minWidth = Math.max(this.children[1].minWidth ?? 0, `${displayValue}`.length)
        this.children[1].style.minWidth = `${this.children[1].minWidth}ch`

        this.children[1].textContent = displayValue ?? `--`
    }

    constructor() {
        super()
        this.appendChild(document.createElement(`td`)).class = `loggedVariableName`
        this.append(document.createElement(`td`))
        this.append(document.createElement(`td`))
        this.append(document.createElement(`td`))
        this.appendChild(document.createElement(`td`)).class = `actions`
        this.value = undefined
    }
}
customElements.define(`ui-loggedvariable`, UILoggedVariable, { extends: `tr` })

export default class Dashboard extends UITemplate {
    static thisDashboard
    static template = 
`<div style="display: flex;">
    <div style="display: flex;">
        <div class="loggedVariables">
            <div>Logged Variables<div data-element="collapseSidebar"></div></div>
            <div data-element="loggedVariables"></div>
        </div>
        <div data-element="expandSidebar"></div>
    </div>
    <div style="display:inline-block;">
        <div data-element="gauges"></div>
    </div>
    <div style="display:block;">
        <div data-element="plots"></div>
    </div>
</div>`

    gauges = document.createElement(`div`)
    plots = document.createElement(`div`)
    loggedVariables = document.createElement(`table`)
    loggedVariablesUnitSelection = new UIUnit()
    loggedVariablesRefreshSelection = new UISelection({
        class: `refreshRateSelection`,
        selectHidden: true,
        options: [
            { name: `0.5Hz`, value: 0.5 },
            { name: `1Hz`, value: 1 },
            { name: `10Hz`, value: 10 },
            { name: `30Hz`, value: 30 },
            { name: `60Hz`, value: 60 },
            { name: `100Hz`, value: 100 },
            { name: `Max`, value: -1 },
        ]
    })
    loggedVariableVariableSelection = new UISelection({
        selectHidden: true
    })
    get options() { return this.loggedVariableVariableSelection.options }
    set options(options) { this.loggedVariableVariableSelection.options = options }
    loggedVariableVariableSelectionDialog = new UIDialog({ title: `Variables` })
    expandSidebar = new UIButton({label:`Logged Variables`, class: `loggedVariablesExpand`})

    get saveValue() {
        let saveValue = super.saveValue
        delete saveValue.loggedVariablesUnitSelection
        delete saveValue.loggedVariablesRefreshSelection
        delete saveValue.loggedVariableVariableSelection
        return saveValue
    }
    set saveValue(saveValue) { super.saveValue = saveValue }

    get value() {
        let value = super.value
        if(value == undefined) return value
        delete value.loggedVariablesUnitSelection
        delete value.loggedVariablesRefreshSelection
        delete value.loggedVariableVariableSelection
        return value
    }
    set value(value) { super.value = value }

    constructor(prop) {
        super()
        Dashboard.thisDashboard = this
        this.loggedVariablesUnitSelection.classList.remove(`unit`)
        this.loggedVariablesUnitSelection.classList.add(`logged-variable-selection`)
        this.loggedVariablesRefreshSelection.classList.add(`logged-variable-selection`)
        this.loggedVariableVariableSelectionDialog.content.appendChild(this.loggedVariableVariableSelection.contextMenuElement).class = `openned`
        this.loggedVariableVariableSelection.addEventListener(`change`, () => {
            this.loggedVariables.saveValue = [ ...this.loggedVariables.saveValue,  { ...this.loggedVariableVariableSelection.value, refreshRate: 60 } ]
            this.RegisterVariables();
        })
        this.RegisterVariables()
        this.plots.class = `plots`
        Object.defineProperty(this.plots, 'saveValue', {
            get: function() { return [...this.children].map(x => x.saveValue) },
            set: function(saveValue) { 
                while(this.children.length > saveValue.length) this.removeChild(this.lastChild)
                for(let i = 0; i < saveValue.length; i++){
                    if(!this.children[i]) {
                        this.append(new UIPlot())
                    }
                    this.children[i].saveValue = saveValue[i]
                }
            }
        })
        this.plots.saveValue = new Array(1)
        this.gauges.class = `gauges`
        Object.defineProperty(this.gauges, 'saveValue', {
            get: function() { return [...this.children].map(x => x.saveValue) },
            set: function(saveValue) { 
                while(this.children.length > saveValue.length) this.removeChild(this.lastChild)
                for(let i = 0; i < saveValue.length; i++){
                    if(!this.children[i]) {
                        this.append(new UIGauge())
                    }
                    this.children[i].saveValue = saveValue[i]
                }
            }
        })
        this.gauges.saveValue = new Array(8)
        const header = this.loggedVariables.appendChild(document.createElement(`tr`))
        const name = header.appendChild(document.createElement(`td`))
        name.textContent = `Name`
        name.class = `loggedVariableName`
        header.appendChild(document.createElement(`td`)).textContent = `Value`
        header.appendChild(document.createElement(`td`)).textContent = `Unit`
        header.appendChild(document.createElement(`td`)).textContent = `Refresh`
        const actions = header.appendChild(document.createElement(`td`))
        actions.class = `actions`
        let btnAdd
        actions.replaceChildren(btnAdd = document.createElement(`div`))
        btnAdd.class = `controladd`
        btnAdd.addEventListener(`click`, event => {
            this.loggedVariableVariableSelectionDialog.show()
        })
        const thisClass = this
        this.loggedVariables.tabIndex = 0
        this.loggedVariables.addEventListener(`keydown`, event => {
            if(event.key === `Delete`) {
                const selectedRow = this.loggedVariables.querySelector(`.selected`)
                if(!selectedRow) return
                this.loggedVariables.removeChild(selectedRow)
                this.RegisterVariables()
            }
        })
        Object.defineProperty(this.loggedVariables, 'saveValue', {
            get: function() { return this.variables },
            set: function(saveValue) { this.variables = saveValue }
        })
        Object.defineProperty(this.loggedVariables, 'variables', {
            get: function() { return [...this.children].map(x => x.variable).slice(1) },
            set: function(variables) { 
                while(this.children.length > variables.length + 1) this.removeChild(this.lastChild)
                for(let i = 0; i < variables.length; i++){
                    if(!this.children[i+1]) {
                        const row = this.appendChild(new UILoggedVariable())
                        communication.variablesToPoll = []
                        let btnDelete
                        row.children[4].replaceChildren(btnDelete = document.createElement(`div`))
                        btnDelete.class = `controldelete`
                        btnDelete.addEventListener(`click`, event => {
                            this.removeChild(row)
                            communication.variablesToPoll = []
                            thisClass.RegisterVariables()
                        })
                        row.addEventListener(`click`, event => {
                            [...this.children].forEach(child => { 
                                child.classList.remove(`selected`)
                                child.unit = child.unit
                                child.refreshRate = child.refreshRate
                            })
                            row.class = `selected`
                            if(row.variable != undefined) {
                                thisClass.loggedVariablesRefreshSelection.value = row.refreshRate
                                thisClass.loggedVariablesUnitSelection.value = row.unit
                                thisClass.loggedVariablesUnitSelection.measurement = GetMeasurementNameFromUnitName(row.unit)
                                row.children[3].replaceChildren(thisClass.loggedVariablesRefreshSelection)
                                row.children[2].replaceChildren(thisClass.loggedVariablesUnitSelection)
                                if(event.target === row.children[2]) thisClass.loggedVariablesUnitSelection.children[0].dispatchEvent(new Event(`click`))
                                if(event.target === row.children[3]) thisClass.loggedVariablesRefreshSelection.children[0].dispatchEvent(new Event(`click`))
                            }
                        })
                    }
                    this.children[i+1].variable = variables[i]
                }
            }
        })
        this.loggedVariablesRefreshSelection.addEventListener(`change`, () => {
            const selectedRow = this.loggedVariables.querySelector(`.selected`)
            if(!selectedRow) return
            selectedRow.refreshRate = this.loggedVariablesRefreshSelection.value
        })
        this.loggedVariablesUnitSelection.addEventListener(`change`, () => {
            const selectedRow = this.loggedVariables.querySelector(`.selected`)
            if(!selectedRow) return
            selectedRow.unit = this.loggedVariablesUnitSelection.value
        })
        this.Setup(prop)
    }
    Setup(prop) {
        super.Setup(prop)
        this.sidebar = this.querySelector(`.loggedVariables`)
        this.expandSidebar.addEventListener(`click`, () => {
            if(this.sidebar.hidden) {
                this.sidebar.hidden = false
                this.expandSidebar.label = ` - Logged Variables`
            } else {
                this.sidebar.hidden = true
                this.expandSidebar.label = ` + Logged Variables`
            }
        })
        this.sidebar.hidden = true
        this.expandSidebar.label = ` + Logged Variables`
    }

    RegisterVariables() {
        function match(a, b) {
            return  a?.name == b?.name &&
                    (a?.type == undefined || b?.type == undefined || a?.type === b?.type) &&
                    (a?.unit == undefined || b?.unit == undefined || GetMeasurementNameFromUnitName(a?.unit) === GetMeasurementNameFromUnitName(b?.unit))
        }
        let options = VariableRegister.GetSelections(undefined, defaultFilter(undefined, [`float|bool`]), false)
        let metadataOptions = communication.variableMetadata?.GetSelections(undefined, defaultFilter(undefined, [ `float|bool` ]), false)
        for(const i in metadataOptions) {
            const option = metadataOptions[i]
            if(option.group) {
                const optionGroup = options.find(x => x.group === option.group)
                if(optionGroup == undefined) {
                    options.push(option)
                } else {
                    for(const i in option.options) {
                        const optionG = option.options[i]
                        if(optionGroup.options.find(x => objectTester(x.value, optionG.value)) == undefined) {
                            optionGroup.options.push(optionG)
                        }
                    }
                }
            } else {
                if(options.find(x => objectTester(x.value, option.value)) == undefined) {
                    options.push(option)
                }
            }
        }
        options = options.map(x => {
            if(-1 !== [...this.loggedVariables.children].findIndex(y => match(x?.value, y?.variable)))
                x.disabled = true
            return x
        });
        options = options.map(z => { z.options = z.options?.map(x => {
            if(-1 !== [...this.loggedVariables.children].findIndex(y => match(x?.value, y?.variable)))
                x.disabled = true
            return x
        }); return z})
        this.options = options;
        [...this.loggedVariables.children].forEach((variableElement, variableIndex) => {
            if(variableIndex === 0)
                return
            variableElement.GUID ??= generateGUID();
            let option = options.find(x => (x.group && x.options? -1 !== x.options.findIndex(x => match(x?.value, variableElement.variable)) : match(x?.value, variableElement.variable)) && x.disabled)
            if(option?.group && option?.options)
                option = option.options.find(x => match(x?.value, variableElement.variable) && x.disabled)

            if(!option) {
                variableElement.hidden = true
                communication.liveUpdateEvents[variableElement.GUID] = undefined;
            } else {
                variableElement.hidden = false
                if(communication.variablesToPoll.indexOf(option.value) === -1)
                    communication.variablesToPoll.push(option.value)
                communication.liveUpdateEvents[variableElement.GUID] = (variableMetadata, currentVariableValues) => {
                    const variableId = variableMetadata?.GetVariableId(option.value)
                    if(currentVariableValues?.[variableId] !== undefined) {
                        variableElement.value = currentVariableValues[variableId]
                    }
                }
            }
        });
        [...this.gauges.children].forEach(x => x.RegisterVariables());
        [...this.plots.children].forEach(x => x.RegisterVariables());
    }
}
customElements.define(`top-dashboard`, Dashboard, { extends: `span` })