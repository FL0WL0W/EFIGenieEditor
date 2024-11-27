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

class UIPlot_Variable extends UITemplate {
    static template = `<div data-element="variable"></div><div data-element="min"></div><div data-element="max"></div>`
    variable = new UIParameterWithUnit()
    min = new UINumberWithUnit()
    max = new UINumberWithUnit()

    get displayUnit() { return this.variable.displayUnit }
    set displayUnit(displayUnit) { this.variable.displayUnit = displayUnit }
    get min() { return this.configTemplate.min.value }
    set min(min) { this.configTemplate.min.value = min }
    get max() { return this.configTemplate.max.value }
    set max(max) { this.configTemplate.max.value = max }

    constructor(prop) {
        super()
        
        this.min.unitHidden = true;
        this.max.unitHidden = true;

        let previousDisplayUnit
        let previousValueUnit
        this.variable.addEventListener(`change`, () => {
            if(previousDisplayUnit != this.displayUnit) {
                const pdu = previousDisplayUnit
                previousDisplayUnit = this.displayUnit
                if(pdu === this.min.displayUnit) this.min.displayUnit = this.displayUnit
                if(pdu === this.max.displayUnit) this.max.displayUnit = this.displayUnit
            }
            this.RegisterVariables()
            if(previousValueUnit != this.valueUnit) {
                previousValueUnit = this.valueUnit
                this.configTemplate.min.valueUnit = this.valueUnit
                this.configTemplate.max.valueUnit = this.valueUnit

                let unitDefaultOptions = GetDefaultMinMaxStepRedlineFromUnit(this.valueUnit)
                this.min = unitDefaultOptions?.min ?? this.min
                this.max = unitDefaultOptions?.max ?? this.max
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
        this.plot = new uPlot({
            title: "Real-Time Data",
            id: "realtimeChart",
            width: 800,
            height: 400,
            scales: {
                x: { }
            },
            series: [
                {},
                { 
                    label: "Value",
                    stroke: "blue",
                    width: 2 
                },
            ],
            axes: [
                { stroke: "#fff", grid: { show: true } },
                { stroke: "#fff", grid: { show: true } },
            ]
        },
        [[0,1,2,3], [0,0.25,0.5,0.75]],
        this.plotWorkspace)

        this.configDialog = new UIDialog({ title: `Edit Plot` })
        this.configDialog.content.append(this.variablesToPlot)

        this.plotWorkspace.addEventListener(`click`, () => {
            this.configDialog.show()
        })

        this.variablesToPlot.addEventListener(`change`, () => {
            console.log(`change`)
            this.RegisterVariables()
            const newSeries = [ {}, ...[...this.variablesToPlot.children].map(uiplotvariable => {
                const value = uiplotvariable.item.value
                const variable = value?.variable
                if(variable === undefined)
                    return
                return {
                    label: variable.name,
                    stroke: "blue",
                    width: 2 
                }
            }).filter(x => x !== undefined)]
            while(this.plot.series.length > newSeries.length) {
                this.plot.delSeries(newSeries.length)
            }
            newSeries.forEach((series, idx) => {
                if(idx < this.plot.series.length) {
                    this.plot.setSeries(idx, series)
                } else {
                    this.plot.addSeries(series, idx)
                }
            })
        })

        this.Setup(prop)
    }

    GUID = generateGUID()
    RegisterVariables() {
        this.variablesToPlot.RegisterVariables()

        const references = [ { name: `CurrentTick` }, ...[...this.variablesToPlot.children].map(x => x.variable.value) ].map( reference => {
            if(!reference?.unit && reference?.type?.split(`|`)?.indexOf(`float`) === -1) return
            if(communication.variablesToPoll.indexOf(reference) === -1)
                communication.variablesToPoll.push(reference)

            return reference;
        })

        communication.liveUpdateEvents[this.GUID] = (variableMetadata, currentVariableValues) => {
            const data = references.map(reference => {
                const variableId = variableMetadata?.GetVariableId(reference)
                return communication.loggedVariableValues.map(x => x[variableId])
            })
            this.plot.setData(data);
        }
    }
}
customElements.define(`ui-plot`, UIPlot, { extends: `span` })