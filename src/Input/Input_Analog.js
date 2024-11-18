import UITemplate from "../JavascriptUI/UITemplate"
import UIPinSelection from "../UI/UIPinSelection"
import RawInputConfigs from "./RawInputConfigs"
export default class Input_Analog extends UITemplate {
    static displayName = `Analog Pin`
    static outputUnits = [ `V` ]
    static template = `<label>Pin:</label><div data-element="pin"></div>`

    pin = new UIPinSelection({ value: 0xFFFF, pinType: `analog` })
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
RawInputConfigs.push(Input_Analog)
customElements.define(`input-analog`, Input_Analog, { extends: `span` })