import React from 'react';
import styles from './overlay.module.css';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    children?: React.ReactElement;
}

export const Overlay: React.FC<Props> = (props: Props) => (
    <AnimatePresence>
        <motion.div
            className={styles.overlay_container}
            initial={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className={styles.overlay}
                initial={{ translateY: 80 }}
                animate={{ translateY: 0 }}
                transition={{ duration: 0.2 }}
            >
                {props.children}
            </motion.div>
        </motion.div>
    </AnimatePresence>
);
