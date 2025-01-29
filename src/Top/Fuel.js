import ConfigContainer from "../Top/ConfigContainer"
import Output_TDC from "../Output/Output_TDC"
import GenericCalculation from "../Calculation/GenericCalculation"
import ConfigList from "./ConfigList"
import OutputList from "../Output/OutputList"
import GenericConfigs from "../Calculation/GenericConfigs"
import InjectorPulseWidthConfigs from "../InjectorPulseWidth/InjectorPulseWidthConfigs"
import { InjectorEnableConfigs, AFRConfigs } from "./TopConfigs"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import UISelection from "../JavascriptUI/UISelection"
class InjectorProperties extends ConfigContainer{
    static template = `<div data-element="InjectorEnable"></div><div data-element="InjectorPulseWidth"></div><div data-element="InjectorPosition"></div>`

    constructor(prop) {
        super()
        this.label = `Injector Properties`
        this.Setup(prop)
    }

    Setup(prop) {
        this.InjectorEnable = new CalculationOrVariableSelection({
            calculations:   InjectorEnableConfigs,
            label:          `Injector Enable`,
            outputTypes:    [ `bool` ],
        })
        this.InjectorPulseWidth = new CalculationOrVariableSelection({
            calculations:   InjectorPulseWidthConfigs,
            label:          `Injector Pulse Width`,
            outputUnits:    [ `s` ],
            displayUnits:   [ `ms` ]
        })
        this.InjectorPosition = new CalculationOrVariableSelection({
            calculations:   GenericConfigs,
            label:          `Injector Position`,
            outputUnits:    [ `°` ],
        })
        this.InjectorPositionAt = new UISelection({
            value:  2,
            options: [
                { name: `Begin`, value: 0 },
                { name: `Middle`, value: 1 },
                { name: `End`, value: 2 }
            ],
            class: `inject-at`
        })
        let span = document.createElement(`span`)
        span.append(`\xa0at`)
        span.append(this.InjectorPositionAt)
        super.Setup(prop)
        this.InjectorPosition.labelElement.parentElement.append(span)
    }

    RegisterVariables() {
        this.InjectorEnable.RegisterVariables({ name: `FuelParameters.Injector Enable` })
        this.InjectorPulseWidth.RegisterVariables({ name: `FuelParameters.Injector Pulse Width` })
        this.InjectorPosition.RegisterVariables({ name: `FuelParameters.Injector Position` })
    }
}
customElements.define(`top-injector-properties`, InjectorProperties, { extends: `span` })

export default class Fuel extends ConfigList {
    constructor(prop) {
        let injectorProperties = new InjectorProperties()
        prop = { ...prop,
            staticItems: [
                { name: `AFR`, item: new GenericCalculation({
                    calculations:   AFRConfigs,
                    name:          `Air Fuel Ratio`,
                    nameEditable:   false,
                    outputUnits:    [ `:1` ],
                })},
                { name: `InjectorProperties`, item: injectorProperties},
                { name: `InjectorOutputs`, item: new OutputList({
                    label: `Injector Outputs`,
                    newOutput(i) {
                        return new Output_TDC({
                            label:          `Injector ${i+1}`,
                            InjectAt:       injectorProperties.InjectorPositionAt
                        })
                    }
                })},
            ],
            itemConstructor: GenericCalculation
        }
        super(prop)
    }

    RegisterVariables() {
        VariableRegister.RegisterVariable({ name: `FuelParameters.Cylinder Fuel Mass`, unit: `g` })
        super.RegisterVariables({ name: `FuelParameters` })
    }
}
customElements.define(`top-fuel`, Fuel, { extends: `div` })
