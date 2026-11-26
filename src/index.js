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

import { downloadBin } from "./download.js"

import Pinouts from "./Pinouts/Pinouts.js"
import "./Pinouts/PinoutESP32C6_Expander.js"
import "./Pinouts/PinoutPurple_Pill_W806.js"
import "./Pinouts/PinoutE78.js"

import VariableRegistry from "./VariableRegistry.js"
window.VariableRegister = new VariableRegistry()

import EnumRegistry from "./EnumRegistry.js"
window.EnumRegister = new EnumRegistry()

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
import Calculation_Static from "./Calculation/Calculation_Static.js"
import Calculation_StaticBoolean from "./Calculation/Calculation_StaticBoolean.js"
import CalculationOrVariableSelection from "./Calculation/CalculationOrVariableSelection.js"
import Calculation_Counter from "./Calculation/Calculation_Counter.js"
import GenericCalculation from "./Calculation/GenericCalculation.js"

import CAN_PackData from "./CAN/CAN_PackData.js"
import CAN_ParseData from "./CAN/CAN_ParseData.js"
import CAN_ReadData from "./CAN/CAN_ReadData.js"
import CAN_WriteData from "./CAN/CAN_WriteData.js"
import CAN_CRCJ1850 from "./CAN/CAN_CRCJ1850.js"

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
import UIContextMenu from "./JavascriptUI/UIContextMenu.js"

import efigenieLogo from "./EFIGenieLogo.svg"

import MAP_GM1Bar from "./MAP/MAP_GM1Bar.js"
import MAP_GM2Bar from "./MAP/MAP_GM2Bar.js"
import MAP_GM3Bar from "./MAP/MAP_GM3Bar.js"
import MAP_Linear from "./MAP/MAP_Linear.js"

import Output_Digital from "./Output/Output_Digital.js"
import Output_TDC from "./Output/Output_TDC.js"
import OutputList from "./Output/OutputList.js"
import Output_PWM from "./Output/Output_PWM.js"
import GenericOutput_PWM from "./Output/GenericOutput_PWM.js"
import GenericOutput_Digital from "./Output/GenericOutput_Digital.js"

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

import { communication } from "./communication.js"
import FileBrowser from "./Top/FileBrowser.js"


window.GetMeasurementNameFromUnitName = GetMeasurementNameFromUnitName;
document.querySelector(`.application-logo`).style.backgroundImage = `url("${efigenieLogo}")`
window.addEventListener(`load`, function() {
    const applicationToolbar = document.querySelector(`.application-toolbar`)
    window.fileBrowser = new FileBrowser({ excludedKeys: [Dashboard.storageKey] })
    window.fileBrowserDialog = new UIDialog()
    window.fileBrowserDialog.content.append(window.fileBrowser)

    let configJsonName = window.localStorage.getItem(`lastConfigName`) ?? `config`
    let loadingConfig = false
    let configLoadVersion = 0

    const loadConfig = (config) => {
        try {
            const saveValue = JSON.parse(config)
            if(!Pinouts[saveValue?.TargetDevice]) return false
            ++configLoadVersion
            loadingConfig = true
            try {
                // Target changes are synchronous and may replace window.b.
                // Finish selecting/mounting the target before assigning its tune.
                if(b.TargetDevice.value !== saveValue.TargetDevice)
                    b.TargetDevice.value = saveValue.TargetDevice
                b.saveValue = saveValue
                document.querySelector(`#btnLoad`).value = ``
                return true
            } finally { loadingConfig = false }
        } catch { return false }
    }

    const loadDefaultConfig = (targetDevice) => {
        const version = ++configLoadVersion
        const xhr = new XMLHttpRequest()
        xhr.open(`GET`, `config.json`, true)
        xhr.onload = xhr.onerror = () => {
            // A file opened or target selected after this request takes priority.
            if(version !== configLoadVersion || (targetDevice && b.TargetDevice.value !== targetDevice)) return
            const fallbackName = window.localStorage.getItem(`lastConfigName`) ?? configJsonName
            const candidates = [
                { name: `config`, data: xhr.status === 200 ? xhr.responseText : undefined },
                { name: fallbackName, data: fallbackName ? window.localStorage.getItem(fallbackName) : undefined }
            ]
            for(const { name, data } of candidates) {
                if(!data) continue
                try {
                    if(targetDevice && JSON.parse(data)?.TargetDevice !== targetDevice) continue
                } catch { continue }
                if(loadConfig(data)) {
                    configJsonName = name
                    window.localStorage.setItem(`lastConfigName`, name)
                    return
                }
            }
            configJsonName = undefined
            window.localStorage.removeItem(`lastConfigName`)
        }
        xhr.send()
    }

    window.buildConfig = buildConfig
    let setupTop = () => {
        if(window.b === undefined)
            window.b = new TopEngine()

        document.querySelector(`#target`).innerHTML = `Target: `
        document.querySelector(`#target`).append(b.TargetDevice)
        b.TargetDevice.addEventListener(`change`, () => {
            const targetDevice = b.TargetDevice.value
            const target = Pinouts[targetDevice]
            if(!target) return
            window.localStorage.setItem(`lastTarget`, targetDevice)
            if(!loadingConfig) ++configLoadVersion
            if(b.constructor !== target.Top) {
                window.b = new target.Top()
                // Mount first so pin-option updates operate on the new controls.
                setupTop()
                b.TargetDevice.value = targetDevice
                if(loadingConfig) return

                const lastConfig = configJsonName ? window.localStorage.getItem(configJsonName) : undefined
                if(configJsonName !== `config` && lastConfig) {
                    try {
                        if(JSON.parse(lastConfig)?.TargetDevice === targetDevice && loadConfig(lastConfig)) return
                    } catch { }
                }
                loadDefaultConfig(targetDevice)
            }
        })

        let workspace = document.querySelector(`#workspace`)
        workspace.innerHTML = ``
        workspace.append(b)
        b.querySelector(`.application-header`).append(applicationToolbar)
    }
    setupTop()

    const lastTarget = window.localStorage.getItem(`lastTarget`)
    const lastConfig = window.localStorage.getItem(configJsonName)
    window.fileBrowser.addEventListener(`filedelete`, ({ detail }) => {
        if(configJsonName !== detail.name) return
        configJsonName = undefined
        window.localStorage.removeItem(`lastConfigName`)
    })

    if(!(configJsonName !== `config` && lastConfig && loadConfig(lastConfig))) {
        const targetDevice = Pinouts[lastTarget] ? lastTarget : undefined
        if(targetDevice) {
            loadingConfig = true
            try { b.TargetDevice.value = targetDevice }
            finally { loadingConfig = false }
        }
        loadDefaultConfig(targetDevice)
    }

    const browseConfigs = () => {
        window.fileBrowser.value = configJsonName ?? ``
        window.fileBrowserDialog.title = `Configurations`
        window.fileBrowser.actionLabel = `Open`
        window.fileBrowserDialog.show()
    }
    const saveConfigAs = () => {
        window.fileBrowser.value = configJsonName ?? ``
        window.fileBrowserDialog.title = window.fileBrowser.actionLabel = `Save`
        window.fileBrowserDialog.show()
    }
    const saveConfig = () => {
        if(configJsonName === undefined) {
            saveConfigAs()
        }
        else {
            window.localStorage.setItem(configJsonName, JSON.stringify(window.b.saveValue))
            window.fileBrowser.markModified(configJsonName)
            window.fileBrowser.updateOptions()
        }
    }
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
            window.fileBrowser.markModified(window.fileBrowser.value)
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
    const btnLoad = document.querySelector(`#btnLoad`)
    window.fileBrowser.uploadButton.addEventListener(`click`, () => btnLoad.click())
    btnLoad.addEventListener(`change`, function(evt){
        const selectedFile = evt.target.files[0]
        if(selectedFile === undefined)
            return

        const file = selectedFile.name.replace(/\.json$/i, ``)
        var test = new FileReader()

        test.onload = function(evt) {
            if(evt.target.readyState != 2) return
            if(evt.target.error) {
                alert(`Error while reading file`)
                return
            }

            const result = evt.target.result
            window.localStorage.setItem(file, result)
            window.fileBrowser.markModified(file, selectedFile.lastModified || Date.now())
            window.localStorage.setItem(`lastConfigName`, configJsonName = file)
            window.fileBrowser.value = file
            window.fileBrowser.updateOptions()
            loadConfig(result)
            btnLoad.value = ``
        }

        test.readAsText(selectedFile)
    })

    const saveLog = () => {
        downloadBin(communication.saveValue, `${configJsonName ?? `log`}.log`)
    }

    const btnOpenLog = document.querySelector(`#btnOpenLog`)
    btnOpenLog.addEventListener(`change`, function(evt){
        const selectedFile = evt.target.files[0]
        if(selectedFile === undefined)
            return

        var test = new FileReader()

        test.onload = function(evt) {
            if(evt.target.readyState != 2) return
            if(evt.target.error) {
                alert(`Error while reading file`)
                return
            }

            const result = evt.target.result
            const target = Pinouts[b.TargetDevice.value]
            communication.ticksPerSecond = target.TicksPerSecond ?? 1_000_000
            communication.endian = target.ProcessorDefinition?.find(type => type.type === `UINT32`)?.endian ?? `little`
            communication.saveValue = result;
        }

        test.readAsArrayBuffer(selectedFile)
    })

    const fileActions = {
        browse: browseConfigs,
        save: saveConfig,
        saveAs: saveConfigAs,
        openLog: () => btnOpenLog.click(),
        saveLog: saveLog,
        browseDashboardViews: () => b.Dashboard.browseViews()
    }
    const fileMenu = new UIContextMenu({
        options: [
            {
                group: `Configuration`,
                options: [
                    { name: `Browse`, action: `browse` },
                    { name: `Save`, action: `save` },
                    { name: `Save As`, action: `saveAs` }
                ]
            },
            {
                group: `Data Log`,
                options: [
                    { name: `Open Log`, action: `openLog` },
                    { name: `Save Log`, action: `saveLog` }
                ]
            },
            {
                group: `Dashboard Views`,
                options: [
                    { name: `Browse`, action: `browseDashboardViews` }
                ]
            }
        ]
    })
    document.querySelector(`.file-menu`).append(fileMenu)
    document.querySelector(`#btnFile`).addEventListener(`click`, () => fileMenu.show())
    fileMenu.addEventListener(`optionselect`, ({ detail }) => fileActions[detail.action]?.())

    const btnConnect = document.querySelector(`#btnConnect`)
    btnConnect.addEventListener(`click`, function(){
        btnConnect.classList.remove(`connection-error`)
        btnConnect.classList.remove(`connected`)
        btnConnect.classList.remove(`connecting`)
        if(communication.connected)
        {
            communication.disconnect()
            btnConnect.value = `Connect`
            return;
        }
        btnConnect.classList.add(`connecting`)
        communication.ticksPerSecond = Pinouts[b.TargetDevice.value].TicksPerSecond ?? 1_000_000
        Pinouts[b.TargetDevice.value].Connect?.()

    })
    communication.addEventListener(`change`, ({ detail: { connectionError, connected } }) => {
        btnConnect.classList.remove(`connecting`)
        if(connectionError)
        {
            btnConnect.classList.remove(`connected`)
            btnConnect.classList.add(`connection-error`)
            btnConnect.value = `Connection Error`
        }
        else if(connected)
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
    })
})
