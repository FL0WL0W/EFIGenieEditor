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

import MAP_GM1Bar from "./MAP/MAP_GM1Bar.js"
import MAP_GM2Bar from "./MAP/MAP_GM2Bar.js"
import MAP_GM3Bar from "./MAP/MAP_GM3Bar.js"
import MAP_Linear from "./MAP/MAP_Linear.js"

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
import FileBrowser from "./Top/FileBrowser.js"


window.GetMeasurementNameFromUnitName = GetMeasurementNameFromUnitName;
window.addEventListener(`load`, function() {
    window.fileBrowser = new FileBrowser()
    window.fileBrowserDialog = new UIDialog()
    window.fileBrowserDialog.content.append(window.fileBrowser)

    const loadConfig = (config) => {
        try {
            b.saveValue = JSON.parse(config)
            let btnLoad = document.querySelector(`#btnLoad`)
            btnLoad.value = ``
        } catch { }
    }

    window.buildConfig = buildConfig
    let setupTop = () => {
        if(window.b === undefined)
            window.b = new TopEngine()

        document.querySelector(`#target`).innerHTML = `Target: `
        document.querySelector(`#target`).append(b.TargetDevice)
        b.TargetDevice.addEventListener(`change`, (e) => {
            const targetDevice = b.TargetDevice.value
            window.localStorage.setItem(`lastTarget`, targetDevice)
            if(b.constructor !== Pinouts[targetDevice].Top) {
                window.b = new Pinouts[b.TargetDevice.value].Top
                b.TargetDevice.value = targetDevice

                let lastConfig = window.localStorage.getItem(configJsonName)
                if(configJsonName !== `config` && lastConfig) {
                    loadConfig(lastConfig)
                } else {
                    const xhr = new XMLHttpRequest()
                    xhr.open(`GET`, `config.json`, true)
                    xhr.onreadystatechange = () => {
                        if (xhr.status == 200) {
                            lastConfig = xhr.responseText
                        }
                        if (lastConfig) {
                            if(JSON.parse(lastConfig)?.TargetDevice === targetDevice) {
                                window.localStorage.setItem(`lastConfigName`, configJsonName = `config`)
                                loadConfig(lastConfig)
                            }
                            return
                        }
                        lastConfig = window.localStorage.getItem(window.localStorage.getItem(`lastConfigName`))
                        if(JSON.parse(lastConfig)?.TargetDevice === targetDevice) {
                            configJsonName = window.localStorage.getItem(`lastConfigName`)
                            loadConfig(lastConfig)
                            return
                        }
                        b.RegisterVariables()
                        window.localStorage.setItem(`lastConfigName`, configJsonName = undefined)
                    }
                    xhr.send()
                }
                setupTop();
            }
        })

        let workspace = document.querySelector(`#workspace`)
        workspace.innerHTML = ``
        workspace.append(b)
        b.addEventListener(`change`, (e) => { b.RegisterVariables() })//this is a hack but oh well
    }
    setupTop()

    const lastTarget = window.localStorage.getItem(`lastTarget`)
    let configJsonName = window.localStorage.getItem(`lastConfigName`) ?? `config`
    let lastConfig = window.localStorage.getItem(configJsonName)

    if(configJsonName !== `config` && lastConfig) {
        loadConfig(lastConfig)
    } else if(lastTarget){
        b.TargetDevice.value = lastTarget
    } else {      
        const xhr = new XMLHttpRequest()
        xhr.open(`GET`, `config.json`, true)
        xhr.onreadystatechange = () => {
            if (xhr.status == 200) {
                lastConfig = xhr.responseText
            }
            if (lastConfig) {
                loadConfig(lastConfig)
                window.localStorage.setItem(`lastConfigName`, configJsonName = `config`)
                return
            }
            lastConfig = window.localStorage.getItem(configJsonName = window.localStorage.getItem(`lastConfigName`))
            if (lastConfig) {
                loadConfig(lastConfig)
                return
            }
            b.RegisterVariables()
            window.localStorage.setItem(`lastConfigName`, configJsonName = undefined)
        };
        xhr.send()
    }

    const btnOpen = document.querySelector(`#btnOpen`)
    btnOpen.addEventListener(`click`, function(){
        window.fileBrowser.value = configJsonName ?? ``
        window.fileBrowserDialog.title = window.fileBrowser.actionLabel = `Open`
        window.fileBrowserDialog.show()
    })
    const btnSaveAs = document.querySelector(`#btnSaveAs`)
    btnSaveAs.addEventListener(`click`, function(){
        window.fileBrowser.value = configJsonName ?? ``
        window.fileBrowserDialog.title = window.fileBrowser.actionLabel = `Save`
        window.fileBrowserDialog.show()
    })
    const btnSave = document.querySelector(`#btnSave`)
    btnSave.addEventListener(`click`, function(){
        if(configJsonName === undefined) {
            window.fileBrowser.value = configJsonName ?? ``
            window.fileBrowserDialog.title = window.fileBrowser.actionLabel = `Save`
            window.fileBrowserDialog.show()
        }
        else {
            window.localStorage.setItem(configJsonName, JSON.stringify(window.b.saveValue))
            window.fileBrowser.updateOptions()
        }
    })
    window.fileBrowser.actionButton.addEventListener(`click`, function(){
        window.fileBrowserDialog.close()
        if(window.fileBrowser.value === undefined)
            return
        if(window.fileBrowser.actionLabel == `Open`) {
            const config = window.localStorage.getItem(window.fileBrowser.value)
            if(config === undefined)
                return
            window.localStorage.setItem(`lastConfigName`, configJsonName = window.fileBrowser.value)
            loadConfig(config)
        }
        if(window.fileBrowser.actionLabel == `Save`) {
            window.localStorage.setItem(`lastConfigName`, configJsonName = window.fileBrowser.value)
            window.localStorage.setItem(window.fileBrowser.value, JSON.stringify(window.b.saveValue))
            window.fileBrowser.updateOptions()
        }
    })

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
        downloadObject(cfg, `${configJsonName ?? `tune`}.json`)
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
        let file = evt.target.files[0].name
        file = file.substr(file.lastIndexOf('\\') + 1).split('.')[0];
        window.localStorage.setItem(`lastConfigName`, configJsonName = file)
    })

    document.querySelector(`#btnSaveLog`).addEventListener(`click`, function(){
        downloadBin(communication.saveValue, `${configJsonName ?? `log`}.log`)
    })
    document.querySelector(`#btnOpenLog`).addEventListener(`change`, function(evt){
        var test = new FileReader()

        test.onload = function(evt) {
            if(evt.target.readyState != 2) return
            if(evt.target.error) {
                alert(`Error while reading file`)
                return
            }

            const result = evt.target.result
            communication.saveValue = result;
        }

        test.readAsArrayBuffer(evt.target.files[0])
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
        Pinouts[b.TargetDevice.value].Connect?.()
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