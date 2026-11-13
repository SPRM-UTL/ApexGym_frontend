import classes from './backgroundLogin.module.css';
import logoImg from '../../assets/apex_gym.png'; 

export default function backgroundLogin() {
    return (
        <div className={classes.backgroundLogin}>
            <div className={classes.logoContent}>
                <img src={logoImg} alt="Apex Gym Logo" className={classes.brandIcon}   />
            </div>
        </div>
    );
}