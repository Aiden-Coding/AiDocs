import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '系统化知识体系',
    icon: '📚',
    description: (
      <>
        涵盖 Java 核心、并发编程、JVM 调优、数据库原理、分布式架构等核心技术栈，构建完整的知识体系。
      </>
    ),
  },
  {
    title: '深度原理解析',
    icon: '🔍',
    description: (
      <>
        拒绝浮于表面，深入源码与底层原理，剖析 AQS、MVCC、分布式共识等硬核技术细节。
      </>
    ),
  },
  {
    title: '实战经验总结',
    icon: '🛠️',
    description: (
      <>
        结合实际业务场景，分享高可用架构设计、性能优化、线上问题排查等宝贵实战经验。
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIconWrapper}>
          <span className={styles.featureIcon}>{icon}</span>
        </div>
        <div className="text--center padding-horiz--md">
          <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
          <p className={styles.featureDesc}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
