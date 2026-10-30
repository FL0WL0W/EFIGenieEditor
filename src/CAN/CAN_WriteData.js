import UINumber from "../JavascriptUI/UINumber"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import ConfigList from "../Top/ConfigList"
import UIPinOverlay from "../UI/UIPinOverlay"
import CAN_PackData from "./CAN_PackData"
import CANConfigs from "./CANConfigs"
import { observeCANMessageLayout } from "./CANDataLayout"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericConfigs from "../Calculation/GenericConfigs"
export default class CAN_WriteData extends UITemplate {
    static displayName = `CAN Write`
    static template = `<span class="can-message-settings"><span class="can-message-settings-content"><div data-element="canBusLabel"></div><div data-element="canBus"></div><div data-element="canIDLabel"></div><div data-element="canID"></div>Interval:<div data-element="interval"></div>Condition:<div data-element="condition"></div></span></span><div data-element="packData"></div>`

    canIDLabel = document.createElement(`span`)
    canID = new UINumber({
        min: 0,
        max: 536870911,
        step: 1,
        value: 0,
        hex: true
    })
    canBusLabel = document.createElement(`span`)
    canBus = new UISelection({
        value: 0,
        selectHidden: true,
        class: `can-bus-selection`
    })
    interval = new UISelection({
        value: 100,
        options: [
            { name: `100Hz`, value: 100 },
            { name: `50Hz`, value: 50 },
            { name: `33Hz`, value: 33 },
            { name: `25Hz`, value: 25 },
            { name: `20Hz`, value: 20 },
            { name: `10Hz`, value: 10 },
            { name: `5Hz`, value: 5 },
            { name: `4Hz`, value: 4 },
            { name: `3Hz`, value: 3 },
            { name: `2Hz`, value: 2 },
            { name: `1Hz`, value: 1 },
        ],
        selectHidden: true,
        class: `can-write-interval`
    })
    condition = new CalculationOrVariableSelection({
        value: undefined,
        outputTypes: [ `bool` ],
        calculations: GenericConfigs,
        template: `<div data-element="selection"></div><span data-element="calculationContent"></span>`
    })
    packData = new ConfigList({
        itemConstructor: CAN_PackData,
        saveValue: [{}],
        class: `configContainer can-message-data`
    })

    constructor(prop) {
        super()
        this.canBusLabel.innerText = `Bus:`
        this.canIDLabel.innerText = 'Identifier:'
        this.condition.style.display = `inline`
        document.addEventListener('change', (e) => {
            if(e.target instanceof UIPinOverlay){
                this.updateOptions(e.target.pinOut)
            }
        })
        this.updateOptions(document.querySelectorAll(`.pinoverlay`)[0]?.pinOut)
        this.Setup(prop)
    }

    updateOptions(pinOut) {
        var options = []
        if(!pinOut) return
        for(var i = 0; i < pinOut.CANBusCount; i++) {
            options.push({
                name: i,
                value: i
            })
        }

        this.canBus.options = options
        if(options.length < 2) {
            this.canBusLabel.hidden = true
            this.canBus.hidden = true
        }
    }

    #stopObservingLayout
    connectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = observeCANMessageLayout(this)
    }

    disconnectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = undefined
    }

    RegisterVariables(reference) {
        this.packData.RegisterVariables(reference)
    }
}
CANConfigs.push(CAN_WriteData)
customElements.define(`can-write-data`, CAN_WriteData, { extends: `span` })
