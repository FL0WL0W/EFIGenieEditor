import UITemplate from "../JavascriptUI/UITemplate"
import UINumber from "../JavascriptUI/UINumber"
import { GetMeasurementNameFromUnitName } from "../UI/UIUnit"
import GenericConfigs from "../Calculation/GenericConfigs"
export default class CAN_CRCJ1850 extends UITemplate {
    static displayName = `CRCJ1850`
    static outputTypes = [ `CANData` ]
    static template = `Start:<div data-element="startLocation"></div>End:<div data-element="endLocation"></div>`
    static bitLength = 8

    startLocation = new UINumber({
        min: 0,
        max: 63,
        step: 1,
        value: 0,
        class: `canBitOffset`
    })
    endLocation = new UINumber({
        min: 0,
        max: 63,
        step: 1,
        value: 63,
        class: `canBitLength`
    })

    constructor(prop) {
        super()
        this.startLocation.addEventListener(`change`, () => {
            if(this.startLocation.value > this.endLocation.value)
                this.endLocation.value = this.startLocation.value
        })
        this.endLocation.addEventListener(`change`, () => {
            if(this.endLocation.value < this.startLocation.value)
                this.startLocation.value = this.endLocation.value
        })
        this.Setup(prop)
    }
    get value() { 
        return {... super.value, isCANCRC: true }
    }
    set value(value) { 
        super.value = value
    }
}
GenericConfigs.push(CAN_CRCJ1850)
customElements.define(`can-crcj1850`, CAN_CRCJ1850, { extends: `span` })