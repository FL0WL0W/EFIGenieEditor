import Top from "./Top";
import Dashboard from "./Dashboard";
import UIPinOverlay from "../UI/UIPinOverlay"
import UISelection from "../JavascriptUI/UISelection";
import Pinouts from "../Pinouts/Pinouts";
import ConfigList from "./ConfigList";
import Input from "../Input/Input";
import CANConfigs from "../CAN/CANConfigs";
import GenericCalculation from "../Calculation/GenericCalculation";
import GenericConfigs from "../Calculation/GenericConfigs";
import FloatOutputConfigs from "../Output/FloatOutputConfigs";

export default class TopExpander extends Top {
    Dashboard = new Dashboard()
    PinOverlay = new UIPinOverlay()
    TargetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } })
    })
    Inputs = new ConfigList({
        itemConstructor: Input,
        saveValue: [{}]
    })
    CAN = new ConfigList({
        newItem() { return new GenericCalculation({ calculations: [ {group: `CAN`, calculations: CANConfigs}, {group: `Generic`, calculations: GenericConfigs} ]  }) }
    })
    Outputs = new ConfigList({
        newItem() { return new GenericCalculation({ calculations: [ {group: `Output`, calculations: FloatOutputConfigs}, {group: `Generic`, calculations: GenericConfigs} ]  }) }
    })

    constructor(prop) {
        super()
        this.addTab(this.Dashboard, `Dashboard`)
        this.addTab(this.PinOverlay, `Pin Mapping`)
        this.addTab(this.Inputs, `Inputs`)
        this.addTab(this.CAN, `CAN`)
        this.addTab(this.Outputs, `Outputs`)
        this.TargetDevice.addEventListener(`change`, () => { 
            this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
        })
        this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
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
        this.Outputs.RegisterVariables({ name: `Outputs` })
        this.Dashboard.RegisterVariables()
        this.PinOverlay.update();
    }
}
customElements.define(`top-topexpander`, TopExpander, { extends: `span` })