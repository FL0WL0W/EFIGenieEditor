import UIDisplayNumberWithUnit from "./UIDisplayNumberWithUnit"
import { GetMeasurementNameFromUnitName } from "./UIUnit"
import { communication } from "../communication"
import { objectTester } from "../JavascriptUI/UIUtils.js"
export default class UIDisplayLiveUpdate extends UIDisplayNumberWithUnit {
    get superHidden() { return super.hidden }
    set superHidden(hidden) { super.hidden = hidden }
    get hidden() { return this._stickyHidden }
    set hidden(hidden) {
        this._stickyHidden = hidden
        if(hidden) super.hidden = hidden
    }

    constructor(prop) {
        super(prop ?? {})
        this.superHidden = true
        this.displayElement.class = `livevalue`
    }

    #enumType = undefined
    #refreshReference = () => {
        if(!this.isConnected || !this.reference) return

        const variable = VariableRegister.GetVariableByReference(this.reference) ?? this.reference
        const enumType = variable?.type === `enum` ? variable.unit : undefined

        if(enumType) {
            this.#enumType = enumType
            this.displayUnitElement.hidden = true
            return
        }

        this.#enumType = undefined
        //bool or something else
        if(!variable?.unit && variable?.type?.split(`|`)?.indexOf(`float`) === -1) {
            this.displayUnitElement.hidden = true
            return
        }
        this.displayUnitElement.hidden = false
        this.measurement = GetMeasurementNameFromUnitName(variable.unit)
        this.valueUnit = variable.unit
    }

    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        if(objectTester(this.reference, reference)) return
        this.#reference = { ...reference }
        this.#refreshReference()
    }

    #communicationChange = ({ detail: { variableMetadata, currentVariableValues } }) => {
        if(this.reference) { 
            const variableId = variableMetadata.GetVariableId(this.reference)
            if(currentVariableValues?.[variableId] !== undefined) {
                this.superHidden = false
                if(this.#enumType) {
                    // Show the human-readable label instead of the raw integer.
                    const raw = currentVariableValues[variableId]
                    this.displayElement.textContent = EnumRegister?.labelForValue(this.#enumType, raw) ?? String(raw)
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
    }

    connectedCallback() {
        VariableRegister.addEventListener(`change`, this.#refreshReference)
        communication.addEventListener(`change`, this.#communicationChange)
        this.#refreshReference()
    }

    disconnectedCallback() {
        VariableRegister.removeEventListener(`change`, this.#refreshReference)
        communication.removeEventListener(`change`, this.#communicationChange)
    }

    RegisterVariables(reference) {
        this.reference = reference
    }
}
customElements.define(`ui-displayliveupdate`, UIDisplayLiveUpdate, { extends: `span` })