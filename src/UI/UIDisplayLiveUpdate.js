import UIDisplayNumberWithUnit from "./UIDisplayNumberWithUnit"
import { GetMeasurementNameFromUnitName } from "./UIUnit"
import { communication } from "../communication"
export default class UIDisplayLiveUpdate extends UIDisplayNumberWithUnit {
    get superHidden() { return super.hidden }
    set superHidden(hidden) { super.hidden = hidden }
    get hidden() { return this._stickyHidden }
    set hidden(hidden) {
        this._stickyHidden = hidden
        if(hidden) super.hidden = hidden
    }

    RegisterVariables(reference) {
        this.reference = reference
        let variable = VariableRegister.GetVariableByReference(reference)
        variable ??= reference

        // Determine if this variable carries a user-defined enum type.
        // type === 'enum' is the flag; the specific enum name lives in unit.
        const enumType = variable?.type === `enum` ? variable.unit : undefined

        if(enumType) {
            // Enum variable: display the label string, not a numeric value.
            this._enumType = enumType
            this.displayUnitElement.hidden = true
        } else {
            // Standard float / bool path.
            if(!variable?.unit && variable?.type?.split(`|`)?.indexOf(`float`) === -1) return
            this._enumType = undefined
            this.measurement = GetMeasurementNameFromUnitName(variable.unit)
            this.valueUnit = variable.unit
        }
    }

    constructor(prop) {
        super(prop ?? {})
        this.superHidden = true
        this.displayElement.class = `livevalue`

        communication.addEventListener(`change`, ({ detail: { variableMetadata, currentVariableValues } }) => {
            if(this.reference) { 
                const variableId = variableMetadata?.GetVariableId(this.reference)
                if(currentVariableValues?.[variableId] !== undefined) {
                    this.superHidden = false
                    if(this._enumType) {
                        // Show the human-readable label instead of the raw integer.
                        const raw = currentVariableValues[variableId]
                        this.displayElement.textContent = window.EnumRegister.labelForValue(this._enumType, raw) ?? String(raw)
                        this.displayUnitElement.hidden = true
                    } else {
                        this.value = currentVariableValues[variableId]
                    }
                    if(!this.superHidden) {
                        if(this.superHidden)
                        this.superHidden = false
                        if(this.TimeoutHandle)
                            window.clearTimeout(this.TimeoutHandle)
        
                        this.TimeoutHandle = window.setTimeout(() => {
                            this.value = undefined
                            this.superHidden = true
                        },5000)
                    }
                } else {
                    this.superHidden = true
                }
            }
        })
    }
}
customElements.define(`ui-displayliveupdate`, UIDisplayLiveUpdate, { extends: `span` })