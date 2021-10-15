import React from 'react';
import styles from './page_structure.module.css';

interface PageSectionProps {
    children: React.ReactChild | React.ReactChild[];
}

export const PageSection: React.FC<PageSectionProps> = (props: PageSectionProps) => (
    <div className={styles.section_container}>
        <div className={styles.section}>{props.children}</div>
    </div>
);
