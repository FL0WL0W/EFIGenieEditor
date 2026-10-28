import UINumber from "../JavascriptUI/UINumber"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import ConfigList from "../Top/ConfigList"
import UIPinOverlay from "../UI/UIPinOverlay"
import CAN_ParseData from "./CAN_ParseData"
import CANConfigs from "./CANConfigs"
import { observeCANMessageLayout } from "./CANDataLayout"
export default class CAN_ReadData extends UITemplate {
    static displayName = `CAN Read`
    static template = `<span class="can-message-settings"><span class="can-message-settings-content"><div data-element="canBusLabel"></div><div data-element="canBus"></div><div data-element="canIDLabel"></div><div data-element="canID"></div></span></span><div data-element="parseData"></div>`

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
    parseData = new ConfigList({
        itemConstructor: CAN_ParseData,
        saveValue: [{}],
        class: `configContainer can-message-data`
    })

    constructor(prop) {
        super()
        this.canBusLabel.innerText = `Bus:`
        this.canIDLabel.innerText = "Identifier:"
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
        this.parseData.RegisterVariables(reference)
    }
}
CANConfigs.push(CAN_ReadData)
customElements.define(`can-read-data`, CAN_ReadData, { extends: `span` })
