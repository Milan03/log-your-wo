
/*const Home = {
    text: 'Home',
    link: '/home',
    icon: 'icon-home',
    translate: 'global.Home'
};*/

const SimpleLog = {
    text: 'Simple Log',
    link: '/log-entry/simple-log',
    icon: 'icon-notebook',
    translate: 'log-entry.SimpleLog'
};

const ImportProgram = {
    text: 'Import Program',
    link: '/log-entry/import-program',
    icon: 'icon-cloud-upload',
    translate: 'sidebar.ImportProgram'
};

const Profile = {
    text: 'Profile',
    link: '/profile',
    icon: 'icon-user',
    translate: 'global.Profile'
};

const headingMain = {
    text: '',
    heading: true,
    translate: 'global.MainNavigation'
};

export const menu: MenuItem[] = [
    headingMain,
    //Home,
    SimpleLog,
    ImportProgram,
    Profile
];
import { MenuItem } from '../core/menu/menu.service';
