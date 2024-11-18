import UITemplate from "../JavascriptUI/UITemplate"
import UICheckBox from "../JavascriptUI/UICheckBox"
import UIPinSelection from "../UI/UIPinSelection"
import RawInputConfigs from "./RawInputConfigs"
export default class Input_Digital extends UITemplate {
    static displayName = `Digital Pin`
    static outputTypes = [ `bool` ]
    static template = `<label>Pin:</label><div data-element="pin"></div><div data-element="inverted"></div>Inverted`

    inverted = new UICheckBox()
    pin = new UIPinSelection({ value: 0xFFFF, pinType: `digitalin` })
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
RawInputConfigs.push(Input_Digital)
customElements.define(`input-digital`, Input_Digital, { extends: `span` })