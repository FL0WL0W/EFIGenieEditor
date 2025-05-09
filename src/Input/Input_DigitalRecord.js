import UITemplate from "../JavascriptUI/UITemplate"
import UICheckBox from "../JavascriptUI/UICheckBox"
import UINumber from "../JavascriptUI/UINumber"
import UIPinSelection from "../UI/UIPinSelection"
import RawInputConfigs from "./RawInputConfigs"
export default class Input_DigitalRecord extends UITemplate {
    static displayName = `Digital Pin (Record)`
    static outputTypes = [ `Record` ]
    static template =   `<label>Pin:</label><div data-element="pin"></div><div data-element="inverted"></div>Inverted` +
                        `<br/><label>Length:</label><div data-element="length"></div>`

    inverted = new UICheckBox()
    pin = new UIPinSelection({ value: 0xFFFF, pinType: `digitalinterrupt` })
    length = new UINumber ({
        value: 2,
        step: 1,
        min: 1,
        max: 1000
    })
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
RawInputConfigs.push(Input_DigitalRecord)
customElements.define(`input-digitalrecord`, Input_DigitalRecord, { extends: `span` })