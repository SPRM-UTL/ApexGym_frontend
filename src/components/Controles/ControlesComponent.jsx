import {
    TextInput,
    Box,
    Divider,
    Group,
    NativeSelect,
    Text,
    Textarea
} from '@mantine/core';
import {
    IconLetterCase,
    IconNumber,
    IconCheckbox,
    IconChevronDown,
    IconChevronUp,
    IconEdit,
} from '@tabler/icons-react';

export function FInput({
    label,
    icon: Icon = IconLetterCase,
    required,
    placeholder,
    type = 'text',
    value,
    error,
    onChange,
}) {

    if (Icon === null) {
        switch (type) {
            case 'text':
                Icon = IconLetterCase;
                break;
            case 'number':
                Icon = IconNumber;
                break;
            case 'boolean':
                Icon = IconCheckbox;
                break;
            case 'select':
                Icon = IconChevronDown;
                break;
            case 'textarea':
                Icon = IconLetterCase;
                break;
            default:
                Icon = IconLetterCase;
                break;
        }
    }

    return (
        <TextInput
            label={label}
            withAsterisk={required}
            placeholder={placeholder}
            type={type}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            leftSection={Icon ? <Icon size={16} stroke={1.5} /> : null}
            onChange={(e) => onChange?.(e.currentTarget.value)}
        />
    );
}

export function FSelect({ label, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect
            label={label}
            withAsterisk={required}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

export function FTextarea({ label, placeholder, value, error, onChange }) {
    return (
        <Textarea
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            minRows={3}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

export const SectionTitle = ({ children, rightSection }) => (
    <Box mb="xs" mt="xs">
        <Group justify="space-between" align="center" mb={4}>
            <Text fw={600} size="sm" c="#1E293B">
                {children}
            </Text>
            {rightSection}
        </Group>
        <Divider color="#E2E8F0" />
    </Box>
);

