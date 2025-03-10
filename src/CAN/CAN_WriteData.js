import UINumber from "../JavascriptUI/UINumber"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import ConfigList from "../Top/ConfigList"
import UIPinOverlay from "../UI/UIPinOverlay"
import CAN_PackData from "./CAN_PackData"
import CANConfigs from "./CANConfigs"
export default class CAN_WriteData extends UITemplate {
    static displayName = `CAN Write`
    static template = `<div data-element="canBusLabel"></div><div data-element="canBus"></div><div data-element="canIDLabel"></div><div data-element="canID"></div>Interval:<div data-element="interval"></div><div data-element="packData"></div>`

    canIDLabel = document.createElement(`span`)
    canID = new UINumber({
        min: 0,
        max: 536870911,
        step: 1,
        value: 0
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
    packData = new ConfigList({
        itemConstructor: CAN_PackData,
        saveValue: [{}],
        class: `configContainer`
    })

    constructor(prop) {
        super()
        this.canBusLabel.innerText = `Bus:`
        this.canIDLabel.innerText = 'Identifier:'
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

    RegisterVariables(reference) {
        this.packData.RegisterVariables(reference)
    }
}
CANConfigs.push(CAN_WriteData)
customElements.define(`can-write-data`, CAN_WriteData, { extends: `span` })