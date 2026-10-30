import { useState } from 'react';
import {
    ActionIcon,
    Box,
    Group,
    Paper,
    Text,
    ThemeIcon,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

export function SectionCard({
    icon,
    iconBg = '#FFF4EC',
    iconColor = '#FF6A00',
    title,
    subtitle,
    badge,
    rightAmount,
    rightAmountColor = '#FF6A00',
    rightExtra,
    collapsible = false,
    defaultOpen = true,
    children,
    style,
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Paper
            radius="md"
            withBorder
            style={{
                borderColor: '#E2E8F0',
                backgroundColor: 'var(--ag-color-surface, #ffffff)',
                overflow: 'hidden',
                ...style,
            }}
        >
            <Group
                justify="space-between"
                align="center"
                p="md"
                style={{
                    cursor: collapsible ? 'pointer' : 'default',
                    borderBottom: open && children ? '1px solid #F1F5F9' : 'none',
                    userSelect: 'none',
                }}
                onClick={collapsible ? () => setOpen((prev) => !prev) : undefined}
            >
                <Group gap="sm" wrap="nowrap">
                    {icon && (
                        <ThemeIcon
                            size={40}
                            radius="md"
                            variant="light"
                            style={{
                                backgroundColor: iconBg,
                                color: iconColor,
                                flexShrink: 0,
                            }}
                        >
                            {icon}
                        </ThemeIcon>
                    )}
                    <div>
                        <Group gap="xs" align="center">
                            <Text fw={700} size="sm" c="#1E293B">
                                {title}
                            </Text>
                            {badge}
                        </Group>
                        {subtitle && (
                            <Text size="xs" c="dimmed">
                                {subtitle}
                            </Text>
                        )}
                    </div>
                </Group>

                <Group gap="xs" wrap="nowrap" align="center">
                    {rightExtra}
                    {rightAmount !== undefined && rightAmount !== null && (
                        <Text fw={800} size="lg" style={{ color: rightAmountColor }}>
                            {rightAmount}
                        </Text>
                    )}
                    {collapsible && (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="md"
                            radius="md"
                            style={{ pointerEvents: 'none' }}
                            aria-label={open ? 'Colapsar sección' : 'Expandir sección'}
                        >
                            {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        </ActionIcon>
                    )}
                </Group>
            </Group>

            {children && (
                <Box
                    p="md"
                    style={{
                        display: !collapsible || open ? 'block' : 'none',
                    }}
                >
                    {children}
                </Box>
            )}
        </Paper>
    );
}

export default SectionCard;
