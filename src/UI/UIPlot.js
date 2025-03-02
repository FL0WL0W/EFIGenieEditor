import { objectTester } from "../JavascriptUI/UIUtils"
import UITemplate from "../JavascriptUI/UITemplate"
import generateGUID from "../GUID"
import { defaultFilter } from "../VariableRegistry"
import { communication } from "../communication"
import ConfigList from "../Top/ConfigList"
import UIParameterWithUnit from "./UIParameterWithUnit"
import UINumberWithUnit from "./UINumberWithUnit"
import Dashboard from "../Top/Dashboard"
import uPlot from "uplot"
import UIDialog from "../JavascriptUI/UIDialog"
import { ConvertValueFromUnitToUnit, GetDefaultMinMaxStepRedlineFromUnit } from "./UIUnit"
import UIColorPicker from "./UIColorPicker"

class UIPlot_Variable extends UITemplate {
    static template = `<div data-element="color"></div><div data-element="variable"></div><div data-element="min"></div><div data-element="max"></div>`
    variable = new UIParameterWithUnit()
    min = new UINumberWithUnit()
    max = new UINumberWithUnit()
    color = new UIColorPicker()

    get valueUnit() { return this.variable.unit }
    get displayUnit() { return this.variable.displayUnit }
    set displayUnit(displayUnit) { this.variable.displayUnit = displayUnit }

    constructor(prop) {
        super()
        
        this.min.unitHidden = true;
        this.max.unitHidden = true;

        let previousDisplayUnit
        let previousValueUnit
        let previousVariable
        this.variable.addEventListener(`change`, () => {
            if(previousDisplayUnit != this.displayUnit) {
                previousDisplayUnit = this.displayUnit
                this.min.displayUnit = this.displayUnit
                this.max.displayUnit = this.displayUnit
            }
            this.RegisterVariables()
            if(previousValueUnit !== this.valueUnit) {
                previousValueUnit = this.valueUnit
                this.min.valueUnit = this.valueUnit
                this.max.valueUnit = this.valueUnit
            }
            if(previousVariable !== this.variable.value?.name) {
                previousVariable = this.variable.value?.name
                let unitDefaultOptions = GetDefaultMinMaxStepRedlineFromUnit(this.valueUnit)
                this.min.value = unitDefaultOptions?.min ?? this.min.value
                this.max.value = unitDefaultOptions?.max ?? this.max.value
            }
        })

        this.Setup(prop)
    }

    RegisterVariables() {
        let options = Dashboard.thisDashboard.options.map(x => x.group && x.options? {...x, options: x.options.map(x => { return {...x, disabled: !x.disabled}})} : {...x, disabled: !x.disabled})
        this.variable.options = options
    }
}
customElements.define(`ui-plot-variable`, UIPlot_Variable, { extends: `span` })
export default class UIPlot extends UITemplate {
    static template = `<div data-element="plotWorkspace"></div>`
    variablesToPlot = new ConfigList({
        itemConstructor: UIPlot_Variable,
        // saveValue: [{}]
    })

    constructor(prop) {
        super()
        
        this.plotWorkspace = document.createElement(`div`)
        const options = {
            title: "Real-Time Data",
            id: "realtimeChart",
            ms: 1,
            width: 800,
            height: 400,
            scales: {
                x: { }
            },
            series: [
                {},
            ],
            axes: [
                { stroke: "#fff", grid: { show: true } },
                { stroke: "#fff", grid: { show: true } },
            ]
        }
        this.plot = new uPlot(options, [], this.plotWorkspace)
        this.plot.options = options

        this.configDialog = new UIDialog({ title: `Edit Plot` })
        this.configDialog.content.append(this.variablesToPlot)

        this.plotWorkspace.addEventListener(`click`, () => {
            this.configDialog.show()
        })

        this.variablesToPlot.addEventListener(`change`, () => {
            this.RegisterVariables()
            const newScales = [...this.variablesToPlot.children].map(uiplotvariable => {
                return { 
                    name: `${uiplotvariable.item.variable.displayUnit}`,
                    valueUnit: uiplotvariable.item.variable.valueUnit,
                    displayUnit: uiplotvariable.item.variable.displayUnit,
                    min: uiplotvariable.item.min.displayValue, 
                    max: uiplotvariable.item.max.displayValue
                }
            }).reduce((scales, value) => {
                scales[value.name] = { 
                    auto: false,
                    range: [ 
                        Math.min(ConvertValueFromUnitToUnit(value.min, value.valueUnit, value.displayUnit) ?? Infinity, scales[value.name]?.range?.[0] ?? Infinity), 
                        Math.max(ConvertValueFromUnitToUnit(value.max, value.valueUnit, value.displayUnit) ?? -Infinity, scales[value.name]?.range?.[1] ?? -Infinity) 
                    ],
                }

                return scales
            }, {})
            const newSeries = [ {}, ...[...this.variablesToPlot.children].map(uiplotvariable => {
                const value = uiplotvariable.item.value
                const variable = value?.variable
                if(variable === undefined)
                    return
                return {
                    label: variable.name,
                    stroke: value.color,
                    scale: `${uiplotvariable.item.variable.displayUnit}`,
                    width: 2 
                }
            }).filter(x => x !== undefined)]
            
            const options = { ...this.plot.options, series: newSeries, scales: { x: {}, ...newScales }, axes: [ { stroke: "#fff", grid: { show: true } }, ...Object.keys(newScales).filter(x => x !== undefined).map(scaleName => { return { scale: `${scaleName}`, stroke: "#fff", grid: { show: true }, values: (self, ticks) => ticks.map(rawValue => rawValue + scaleName), }  } ) ] }
            this.plot.destroy()
            delete this.plot
            this.plot = new uPlot(options, [], this.plotWorkspace)
            this.plot.options = options
        })

        this.Setup(prop)
    }

    GUID = generateGUID()
    RegisterVariables() {
        this.variablesToPlot.RegisterVariables()

        const displayUnits = [ undefined, ...[...this.variablesToPlot.children].map(x => x.variable.displayUnit)]
        const references = [ { name: `CurrentTick` }, ...[...this.variablesToPlot.children].map(x => x.variable.value) ].map( reference => {
            if(!reference?.unit && reference?.type?.split(`|`)?.indexOf(`float`) === -1) return
            // if(communication.variablesToPoll.indexOf(reference) === -1)
            //     communication.variablesToPoll.push(reference)

            return reference;
        })

        communication.liveUpdateEvents[this.GUID] = (variableMetadata, currentVariableValues) => {
            const data = references.map((reference, idx) => {
                const variableId = variableMetadata?.GetVariableId(reference)
                if(reference) {
                    if(reference.name === `CurrentTick`) {
                        const UINT32_MAX = 0xFFFFFFFF
                        const ticks = communication.loggedVariableValues.map(x => x[variableId] / 1000)
                        let previousTick = 0
                        return ticks.map((tick, idx) => communication.startedLoggingTime + (previousTick += (idx > 0? (tick - ticks[idx - 1] + (tick > ticks[idx-1]? 0 : UINT32_MAX)) : 0)))
                    }
                    return communication.loggedVariableValues.map(x => ConvertValueFromUnitToUnit(x[variableId], reference.unit, displayUnits[idx]))
                }
            })
            this.plot.setData(data);
        }
    }
}
customElements.define(`ui-plot`, UIPlot, { extends: `span` })