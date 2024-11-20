import Top from "./Top";
import Dashboard from "./Dashboard";
import UIPinOverlay from "../UI/UIPinOverlay"
import UISelection from "../JavascriptUI/UISelection";
import Inputs from "./Inputs";
import CAN from "./CAN";
import Pinouts from "../Pinouts/Pinouts";

export default class TopExpander extends Top {
    Dashboard = new Dashboard()
    PinOverlay = new UIPinOverlay()
    TargetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } }),
        value: `ESP32C6_Expander`
    })
    Inputs = new Inputs()
    CAN = new CAN();

    constructor(prop) {
        super()
        this.addTab(this.Dashboard, `Dashboard`)
        this.addTab(this.PinOverlay, `Pin Mapping`)
        this.addTab(this.Inputs, `Inputs`)
        this.addTab(this.CAN, `CAN`)
        this.Setup(prop)
    }

    get saveValue() { return super.saveValue }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.RegisterVariables()
    }

    RegisterVariables() {
        VariableRegister.Clear()
        this.Inputs.RegisterVariables()
        this.CAN.RegisterVariables({ name: `CANParameters` })
        this.Dashboard.RegisterVariables()
        this.PinOverlay.update();
    }
}
customElements.define(`top-topexpander`, TopExpander, { extends: `span` })