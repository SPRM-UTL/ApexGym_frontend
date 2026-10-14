import classes from './backgroudLogin.module.css';
import logoImg from '../../assets/apex_gym.png'; 

export default function BackgruondLogin() {
    return (
        <div className={classes.backgroundLogin}>
            <div className={classes.logoContent}>
                <img src={logoImg} alt="Apex Gym Logo" className={classes.brandIcon}   />
            </div>
        </div>
    );
}