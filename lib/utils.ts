import { BindingDefinition } from '@azure/functions';

export function extractBindings(bindingDefinitions: BindingDefinition[]) {
    const { triggers, inputs, outputs } = bindingDefinitions.reduce<{ inputs: BindingDefinition[]; outputs: BindingDefinition[]; triggers: BindingDefinition[] }>((definitions, next) => {
        if (next.type.toLowerCase().endsWith('trigger')) {
            definitions.triggers.push(next);
        } else if (next.direction === 'in') {
            definitions.inputs.push(next);
        } else if (next.direction === 'out') {
            definitions.outputs.push(next);
        }
        return definitions;
    }, { inputs: [], outputs: [], triggers: [] });
    if (triggers.length > 1) {
        throw new Error('Invalid binding definition, only one trigger can be defined');
    }
    return {
        trigger: triggers[0],
        inputs,
        outputs,
    };
}
