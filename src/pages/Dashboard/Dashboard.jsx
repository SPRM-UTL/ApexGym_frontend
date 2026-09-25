import { IconBulb, IconCheckbox, IconPlus, IconSearch, IconUser, IconLogout } from '@tabler/icons-react';
import {
    ActionIcon,
    Badge,
    Box,
    Code,
    Group,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import { UserButton } from '../../components/UserButton/UserButton.jsx';
import classes from './Dashboard.module.css';
import { Link } from 'react-router-dom';

const links = [
    { icon: IconBulb, label: 'Activity', notifications: 3 },
    { icon: IconCheckbox, label: 'Tasks', notifications: 4 },
    { icon: IconUser, label: 'Contacts' },
];

const collections = [
    { emoji: '👍', label: 'Sales', ruta: '' },
    { emoji: '🚚', label: 'Deliveries', ruta: '' },
    { emoji: '💸', label: 'Discounts', ruta: '' },
    { emoji: '💰', label: 'Profits', ruta: '' },
    { emoji: '✨', label: 'Reports', ruta: '' },
    { emoji: '🛒', label: 'Orders', ruta: '' },
    { emoji: '📅', label: 'Events', ruta: '' },
    { emoji: '🙈', label: 'Debts', ruta: '' },
    { emoji: '💁‍♀️', label: 'Usuarios', ruta: '/usuarios' },
];

export function Dashboard({ children, onLogout }) {
    const mainLinks = links.map((link) => (
        <UnstyledButton key={link.label} className={classes.mainLink}>
            <div className={classes.mainLinkInner}>
                <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
                <span>{link.label}</span>
            </div>
            {link.notifications && (
                <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
                    {link.notifications}
                </Badge>
            )}
        </UnstyledButton>
    ));

    const collectionLinks = collections.map((collection) => (
        <Link
            to={collection.ruta}
            key={collection.label}
            className={classes.collectionLink}
        >
            <Box component="span" mr={9} fz={16}>
                {collection.emoji}
            </Box>{' '}
            {collection.label}
        </Link>
    ));

    return (
        <div className={classes.layout}>
            <nav className={classes.navbar}>
                <div className={classes.section}>
                    <UserButton />
                </div>

                <TextInput
                    placeholder="Search"
                    size="xs"
                    leftSection={<IconSearch size={12} stroke={1.5} />}
                    rightSectionWidth={70}
                    rightSection={<Code className={classes.searchCode}>Ctrl + K</Code>}
                    styles={{ section: { pointerEvents: 'none' } }}
                    mb="sm"
                    aria-label="Search"
                />

                <div className={classes.section}>
                    <div className={classes.mainLinks}>{mainLinks}</div>
                </div>

                <div className={`${classes.section} ${classes.collectionsWrapper}`}>
                    <Group className={classes.collectionsHeader} justify="space-between">
                        <Text size="xs" fw={500} c="dimmed">
                            Collections
                        </Text>
                        <Tooltip label="Create collection" withArrow position="right">
                            <ActionIcon variant="default" size={18} aria-label="Create collection">
                                <IconPlus size={12} stroke={1.5} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <div className={classes.collections}>{collectionLinks}</div>
                </div>

                <div className={classes.section}>
                    <div>
                        <a href="#" className={classes.link} onClick={(event) => { event.preventDefault(); onLogout(); }}>
                            <IconLogout className={classes.linkIcon} stroke={1.5} />
                            <span>Logout</span>
                        </a>
                    </div>
                </div>
            </nav>

            <div className={classes.content}>
                {children}
            </div>
        </div>
    );
}

export default Dashboard;
