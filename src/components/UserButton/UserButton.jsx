import { IconChevronRight } from '@tabler/icons-react';
import { Avatar, Group, Text, UnstyledButton } from '@mantine/core';
import classes from './UserButton.module.css';

export function UserButton() {
    return (
        <UnstyledButton className={classes.user}>
            <Group>
                <Avatar
                    src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png"
                    radius="xl"
                    alt="User"
                />

                <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                        Usuario ApexGym
                    </Text>

                    <Text c="dimmed" size="xs">
                        usuario@apexgym.com
                    </Text>
                </div>

                <IconChevronRight size={14} stroke={1.5} />
            </Group>
        </UnstyledButton>
    );
}
