let hiddenGetterSetter = {
    enumerable: true,
    get: function() {
        return this.style.display === `none`
    },
    set: function(hidden) {
        if(hidden && this.style.display !== `none`) {
            if(this.style.display)
                this._previousDisplayValue = this.style.display
            this.style.display = `none`
        } else if(!hidden && this.style.display === `none`) {
            if(this._previousDisplayValue)
                this.style.display = this._previousDisplayValue
            else 
                this.style.display = null
            delete this._previousDisplayValue
        }
    }
}
Object.defineProperty(HTMLElement.prototype, 'hidden', hiddenGetterSetter)
Object.defineProperty(SVGElement.prototype, 'hidden', hiddenGetterSetter)
Object.defineProperty(HTMLElement.prototype, 'class', {
    enumerable: true,
    set: function(pclass) {
        pclass.split(` `).forEach(pclass => { this.classList.add(pclass) })
    }
})

import "./config.json"
import "./JavascriptUI/UI.css"
import "./styles/style.css"
import 'uplot/dist/uPlot.min.css';

import { downloadBin, downloadObject } from "./download.js"

import Pinouts from "./Pinouts/Pinouts.js"
import "./Pinouts/PinoutESP32C6_Expander.js"
import "./Pinouts/PinoutPurple_Pill_W806.js"

import VariableRegistry from "./VariableRegistry.js"
window.VariableRegister = new VariableRegistry()

import buildConfig from "./buildConfig.js"

import UIDisplayLiveUpdate from "./UI/UIDisplayLiveUpdate.js"
import UIDisplayNumberWithUnit from "./UI/UIDisplayNumberWithUnit.js"
import UIGauge from "./UI/UIGauge.js"
import UINumberWithUnit from "./UI/UINumberWithUnit.js"
import UIParameterWithUnit from "./UI/UIParameterWithUnit.js"
import UIPinOverlay from "./UI/UIPinOverlay.js"
import UIPinSelection from "./UI/UIPinSelection.js"
import UIPlot from "./UI/UIPlot.js"
import UITableWithUnit from "./UI/UITableWithUnit.js"
import UIUnit, { GetMeasurementNameFromUnitName } from "./UI/UIUnit.js"

import Calculation_2AxisTable from "./Calculation/Calculation_2AxisTable.js"
import Calculation_Formula from "./Calculation/Calculation_Formula.js"
import Calculation_LookupTable from "./Calculation/Calculation_LookupTable.js"
import Calculation_Polynomial from "./Calculation/Calculation_Polynomial.js"
import Calcuation_Static from "./Calculation/Calculation_Static.js"
import CalculationOrVariableSelection from "./Calculation/CalculationOrVariableSelection.js"
import GenericCalculation from "./Calculation/GenericCalculation.js"

import CAN_PackData from "./CAN/CAN_PackData.js"
import CAN_ParseData from "./CAN/CAN_ParseData.js"
import CAN_ReadData from "./CAN/CAN_ReadData.js"
import CAN_WriteData from "./CAN/CAN_WriteData.js"

import CylinderAirmass_AlphaN from "./CylinderAirmass/CylinderAirmass_AlphaN.js"
import CylinderAirmass_SpeedDensity from "./CylinderAirmass/CylinderAirmass_SpeedDensity.js"

import InjectorPulseWidth_DeadTime from "./InjectorPulseWidth/InjectorPulseWidth_DeadTime.js"

import Input_Analog from "./Input/Input_Analog.js"
import Input_AnalogPolynomial from "./Input/Input_AnalogPolynomial.js"
import Input_Digital from "./Input/Input_Digital.js"
import Input_DigitalRecord from "./Input/Input_DigitalRecord.js"
import Input_DutyCycle from "./Input/Input_DutyCycle.js"
import Input_Frequency from "./Input/Input_Frequency.js"
import Input_PulseWidth from "./Input/Input_PulseWidth.js"
import Input from "./Input/Input.js"

import UIText from "./JavascriptUI/UIText.js"
import UINumber from "./JavascriptUI/UINumber.js"
import UICheckBox from "./JavascriptUI/UICheckBox.js"
import UITemplate from "./JavascriptUI/UITemplate.js"
import UISelection from "./JavascriptUI/UISelection.js"
import UITable from "./JavascriptUI/UITable.js"
import UIGraph3D from "./JavascriptUI/UIGraph3D.js"
import UIGraph2D from "./JavascriptUI/UIGraph2D.js"
import UIDialog from "./JavascriptUI/UIDialog.js"

import Map_GM1Bar from "./MAP/MAP_GM1Bar.js"
import Map_GM2Bar from "./MAP/MAP_GM2Bar.js"
import Map_GM3Bar from "./MAP/MAP_GM3Bar.js"

import Output_Digital from "./Output/Output_Digital.js"
import Output_TDC from "./Output/Output_TDC.js"
import OutputList from "./Output/OutputList.js"
import Output_PWM from "./Output/Output_PWM.js"

import ReluctorGM24x from "./Reluctor/Reluctor_GM24x.js"
import Reluctor_Template from "./Reluctor/Reluctor_Template.js"
import Reluctor_Universal1x from "./Reluctor/Reluctor_Universal1x.js"
import Reluctor_UniversalMissingTeeth from "./Reluctor/Reluctor_UniversalMissingTeeth.js"

import ConfigContainer from "./Top/ConfigContainer.js"
import ConfigList from "./Top/ConfigList.js"
import Dashboard from "./Top/Dashboard.js"
import Engine from "./Top/Engine.js"
import Fuel from "./Top/Fuel.js"
import Ignition from "./Top/Ignition.js"
import TopExpander from "./Top/TopExpander.js"
import TopEngine from "./Top/TopEngine.js"

import TPS_Linear from "./TPS/TPS_Linear.js"

import pako from "pako"
import { communication, Serial, EFIGenieCommunication } from "./communication.js"
import generateGUID from "./GUID.js"


window.GetMeasurementNameFromUnitName = GetMeasurementNameFromUnitName;
window.addEventListener(`load`, function() {

    communication._serial = new Serial({ baudRate: 1000000 }, [ 
            // { usbVendorId: 1155, usbProductId: 22336 } ,
            { usbVendorId: 0x1a86, usbProductId: 0x7523 } 
        ])
    // communication._serial = new Socket("EFIGenieCommunication")
    window.communication = communication
    window.Pinouts = Pinouts

    window.buildConfig = buildConfig
    window.b = new TopEngine()
    let workspace = document.querySelector(`#workspace`)
    workspace.innerHtml = ``
    workspace.append(b)
    b.addEventListener(`change`, (e) => { b.RegisterVariables() })//this is a hack but oh well
    const loadConfig = (config) => {
        try {
            b.saveValue = JSON.parse(config)
            let btnLoad = document.querySelector(`#btnLoad`)
            btnLoad.value = ``
        } catch { }
    }
    let lastConfig = window.localStorage.getItem(`config`)
    loadConfig(lastConfig)
    // const xhr = new XMLHttpRequest()
    // xhr.open(`GET`, `config.json`, true)
    // xhr.onreadystatechange = () => {
    //     if (xhr.status == 200) {
    //         lastConfig = xhr.responseText
    //     }
    //     if (lastConfig) {
    //         loadConfig(lastConfig)
    //     } else {
    //         b.RegisterVariables()
    //     }
    // };
    // xhr.send()

    let configJsonName = `tune.json`
    let btnBurnTimeout;
    const btnBurn = document.querySelector(`#btnBurn`)
    btnBurn.addEventListener(`click`, function(){
        clearTimeout(btnBurnTimeout)
        btnBurn.classList.remove(`connection-error`)
        btnBurn.classList.remove(`connected`)
        btnBurn.classList.add(`connecting`)
        btnBurn.value = `Burning`
        Pinouts[b.TargetDevice.value].Burn(b).then(function() { 
            btnBurn.classList.remove(`connection-error`)
            btnBurn.classList.add(`connected`)
            btnBurn.classList.remove(`connecting`)
            btnBurn.value = `Burned`
            btnBurnTimeout = setTimeout(() => {
                btnBurn.classList.remove(`connected`)
                btnBurn.value = `Burn`
            }, 5000)
        }).catch(function(e) { 
            console.log(e)
            btnBurn.classList.add(`connection-error`)
            btnBurn.classList.remove(`connected`)
            btnBurn.classList.remove(`connecting`)
            btnBurn.value = `Burn Error`
            btnBurnTimeout = setTimeout(() => {
                btnBurn.classList.remove(`connection-error`)
                btnBurn.value = `Burn`
            }, 5000)
        })
    })
    document.querySelector(`#btnDownload`).addEventListener(`click`, function(){
        var cfg = b.saveValue
        downloadObject(cfg, configJsonName)
    })
    document.querySelector(`#btnLoad`).addEventListener(`change`, function(evt){
        var test = new FileReader()

        test.onload = function(evt) {
            if(evt.target.readyState != 2) return
            if(evt.target.error) {
                alert(`Error while reading file`)
                return
            }

            const result = evt.target.result
            window.localStorage.setItem(`config`, result)
            loadConfig(result)
        }

        test.readAsText(evt.target.files[0])
        configJsonName = evt.target.files[0].name
    })

    let connectGUID = generateGUID()
    const btnConnect = document.querySelector(`#btnConnect`)
    btnConnect.addEventListener(`click`, function(){
        btnConnect.classList.remove(`connection-error`)
        btnConnect.classList.remove(`connected`)
        btnConnect.classList.remove(`connecting`)
        if(communication.connected)
        {
            delete communication.liveUpdateEvents[connectGUID]
            communication.disconnect()
            btnConnect.value = `Connect`
            return;
        }
        btnConnect.classList.add(`connecting`)
        communication.connect()
        communication.liveUpdateEvents[connectGUID] = (variableMetadata, currentVariableValues) => {
            btnConnect.classList.remove(`connecting`)
            if(communication.connectionError)
            {
                btnConnect.classList.remove(`connected`)
                btnConnect.classList.add(`connection-error`)
                btnConnect.value = `Connection Error`
            }
            else if(communication.connected)
            {
                btnConnect.classList.remove(`connection-error`)
                btnConnect.classList.add(`connected`)
                btnConnect.value = `Connected`
            }
            else
            {
                btnConnect.value = `Connection Paused`
                btnConnect.classList.add(`connecting`)
            }
        }
    })
})