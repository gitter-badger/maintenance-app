export default {
    getSideBarConfig() {
        return {
            all: {
                items: [],
            },
            dataElementSection: {
                items: [
                    'categoryOption',
                    'category',
                    'categoryCombo',
                    'categoryOptionCombo',
                    'categoryOptionGroup',
                    'categoryOptionGroupSet',
                    'dataElement',
                    'dataElementGroup',
                    'dataElementGroupSet',
                ],
            },
            dataSetSection: {
                items: [
                    'dataSet',
                ],
            },
            indicatorSection: {
                items: [
                    'indicator',
                    'indicatorType',
                    'indicatorGroup',
                    'indicatorGroupSet',
                ],
            },

            organisationUnitSection: {
                items: [
                    'organisationUnit',
                    'organisationUnitGroup',
                    'organisationUnitGroupSet',
                    'organisationUnitLevel',
                ],
            },

            validationSection: {
                items: [
                    'validationRule',
                    'validationRuleGroup',
                ],
            },

            otherSection: {
                items: [
                    'constant',
                    'attribute',
                    'optionSet',
                ],
            },
        };
    },
};
