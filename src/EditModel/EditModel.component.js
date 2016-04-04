import React from 'react';
import Router from 'react-router';
import fieldOverrides from '../config/field-overrides/index';
import fieldOrderNames from '../config/field-config/field-order';
import disabledOnEdit from '../config/disabled-on-edit';
import FormFieldsForModel from '../forms/FormFieldsForModel';
import FormFieldsManager from '../forms/FormFieldsManager';
import {config, getInstance as getD2} from 'd2/lib/d2';
import modelToEditStore from './modelToEditStore';
import objectActions from './objectActions';
import snackActions from '../Snackbar/snack.actions';
import SaveButton from './SaveButton.component';
import CancelButton from './CancelButton.component';
import Paper from 'material-ui/lib/paper';
import {isString, camelCaseToUnderscores} from 'd2-utilizr';
import SharingNotification from './SharingNotification.component';
import FormButtons from './FormButtons.component';
import log from 'loglevel';
import FormHeading from './FormHeading';
import extraFields from './extraFields';
import CircularProgress from 'material-ui/lib/circular-progress';

import BackButton from './BackButton.component';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import FormBuilder from 'd2-ui/lib/forms/FormBuilder.component';
import { goToRoute, goBack } from '../router';
import {createFieldConfig, typeToFieldMap} from '../forms/fields';

config.i18n.strings.add('name');
config.i18n.strings.add('code');
config.i18n.strings.add('short_name');

function getAttributeFieldConfigs(modelToEdit) {
    Object
        .keys(modelToEdit.modelDefinition.attributeProperties)
        .forEach((key) => {
            this.context.d2.i18n.translations[key] = key;
            return key;
        });

    return Object
        .keys(modelToEdit.modelDefinition.attributeProperties)
        .map(attributeName => {
            const attribute = modelToEdit.modelDefinition.attributeProperties[attributeName];

            return createFieldConfig({
                name: attribute.name,
                valueType: attribute.valueType,
                type: typeToFieldMap.get(attribute.optionSet ? 'CONSTANT' : attribute.valueType),
                required: Boolean(attribute.mandatory),
                fieldOptions: {
                    labelText: attribute.name,
                    options: attribute.optionSet ? attribute.optionSet.options.map(option => {
                        return {
                            name: option.displayName || option.name,
                            value: option.code,
                        };
                    }) : [],
                },
            }, modelToEdit.modelDefinition, this.context.d2.models, modelToEdit);
        })
        .map(attributeFieldConfig => {
            attributeFieldConfig.value = modelToEdit.attributes[attributeFieldConfig.name];
            return attributeFieldConfig;
        });
}

// TODO: Gives a flash of the old content when switching models (Should probably display a loading bar)
export default React.createClass({
    propTypes: {
        modelId: React.PropTypes.string.isRequired,
        modelType: React.PropTypes.string.isRequired,
    },

    mixins: [Translate],

    getInitialState() {
        return {
            modelToEdit: undefined,
            isLoading: true,
            formState: {
                validating: false,
                valid: true,
            },
        };
    },

    componentWillMount() {
        const modelType = this.props.modelType;

        getD2().then(d2 => {
            const formFieldsManager = new FormFieldsManager(new FormFieldsForModel(d2.models));
            formFieldsManager.setFieldOrder(fieldOrderNames.for(modelType));

            for (const [fieldName, overrideConfig] of fieldOverrides.for(modelType)) {
                formFieldsManager.addFieldOverrideFor(fieldName, overrideConfig);
            }

            this.disposable = modelToEditStore
                .subscribe((modelToEdit) => {
                    const fieldConfigs = (formFieldsManager.getFormFieldsForModel(modelToEdit))
                            .map(fieldConfig => {
                                if (this.props.modelId !== 'add' && disabledOnEdit.for(modelType).indexOf(fieldConfig.name) !== -1) {
                                    fieldConfig.props.disabled = true;
                                }
                                fieldConfig.value = modelToEdit[fieldConfig.name];

                                return fieldConfig;
                            });

                    this.setState({
                        fieldConfigs: [].concat(
                            fieldConfigs,
                            getAttributeFieldConfigs.call(this, modelToEdit),
                            (extraFields[modelType] || []).map(config => {
                                config.props = config.props || {};
                                config.props.modelToEdit = modelToEdit;
                                return config;
                            })
                        )
                            .map(fieldConfig => {
                                // TODO: Take this code out to a sort of formRulesRunner, that can modify the fieldConfigs before the render
                                if (modelToEdit.modelDefinition.name === 'dataElement') {
                                    // Disable the categoryCombo field when working with a tracker dataElement
                                    if (fieldConfig.name === 'categoryCombo' && modelToEdit.domainType === 'TRACKER') {
                                        fieldConfig.props.disabled = true;
                                    }
                                    // Disable aggregationOperator when working with a tracker dataElement
                                    if (fieldConfig.name === 'aggregationType' && modelToEdit.domainType === 'TRACKER') {
                                        fieldConfig.props.disabled = true;
                                    }
                                    // Disable valueType when an optionSet is selected
                                    if (fieldConfig.name === 'valueType' && modelToEdit.optionSet) {
                                        fieldConfig.props.disabled = true;
                                    }
                                }

                                // Get translation for the field label
                                fieldConfig.props.labelText = this.getTranslation(fieldConfig.props.labelText);

                                // Add required indicator when the field is required
                                if (fieldConfig.required) {
                                    fieldConfig.props.labelText = `${fieldConfig.props.labelText} (*)`;
                                }
                                return fieldConfig;
                            }),
                        modelToEdit: modelToEdit,
                        isLoading: false,
                    });
                }, (errorMessage) => {
                    snackActions.show({message: errorMessage});
                });

            this.setState({
                formFieldsManager: formFieldsManager,
            });
        });
    },

    componentWillReceiveProps() {
        this.setState({
            isLoading: true,
        });
    },

    componentWillUnmount() {
        this.disposable && this.disposable.dispose();
    },

    getTranslatedPropertyName(propertyName) {
        return this.getTranslation(camelCaseToUnderscores(propertyName));
    },

    render() {
        const formPaperStyle = {
            width: '100%',
            margin: '0 auto 2rem',
            padding: '2rem 5rem 4rem',
            position: 'relative',
        };

        const renderForm = () => {
            if (this.state.isLoading) {
                return (
                    <CircularProgress mode="indeterminate" />
                );
            }

            const backButtonStyle = {
                position: 'absolute',
                left: 5,
                top: 5,
            };

            return (
                <Paper style={formPaperStyle}>
                    <div style={backButtonStyle}><BackButton onClick={this._goBack} toolTip="back_to_list" /></div>
                    <FormHeading text={camelCaseToUnderscores(this.props.modelType)} />

                    <FormBuilder
                        fields={this.state.fieldConfigs}
                        onUpdateField={this._onUpdateField}
                        onUpdateFormStatus={this._onUpdateFormStatus}
                    />
                    <FormButtons>
                        <SaveButton onClick={this._saveAction} isValid={this.state.formState.valid && !this.state.formState.validating} isSaving={this.state.isSaving} />
                        <CancelButton onClick={this._closeAction} />
                    </FormButtons>
                </Paper>
            );
        };

        const wrapStyle = {
            paddingTop: '2rem',
        };

        return (
            <div style={wrapStyle}>
                <SharingNotification style={formPaperStyle} modelType={this.props.modelType} />
                {this.state.isLoading ? 'Loading data...' : renderForm()}
            </div>
        );
    },

    _goBack() {
        goBack();
    },

    _registerValidator(attributeValidator) {
        this.setState({
            attributeValidatorRunner: attributeValidator,
        });
    },

    _onUpdateField(fieldName, value) {
        objectActions.update({fieldName, value});
    },

    _onUpdateFormStatus(formState) {
        this.setState({
            formState,
        });
    },

    _saveAction(event) {
        event.preventDefault();
        // Set state to saving so forms actions are being prevented
        this.setState({ isSaving: true });

        objectActions.saveObject({id: this.props.modelId})
            .subscribe(
            (message) => {
                this.setState({ isSaving: false });

                snackActions.show({message, action: 'ok', translate: true});

                goToRoute(`/list/${this.props.groupName}/${this.props.modelType}`);
            },
            (errorMessage) => {
                this.setState({ isSaving: false });

                if (isString(errorMessage)) {
                    log.debug(errorMessage);
                    snackActions.show({message: errorMessage});
                }

                if (errorMessage.messages && errorMessage.messages.length > 0) {
                    log.debug(errorMessage.messages);

                    if (this.context.d2.i18n.isTranslated(errorMessage.messages[0].errorCode)) {
                        snackActions.show({message: this.context.d2.i18n.getTranslation(errorMessage.messages[0].errorCode)});
                    } else {
                        snackActions.show({message: errorMessage.messages[0].message});
                    }
                }

                if (errorMessage === 'No changes to be saved') {
                    goToRoute(`/list/${this.props.groupName}/${this.props.modelType}`);
                }
            }
        );
    },

    _closeAction(event) {
        event.preventDefault();

        goToRoute(`/list/${this.props.modelType}`);
    },
});
