import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  emoji: string;
  description: ReactNode;
  tags: string[];
};

const FeatureList: FeatureItem[] = [
  {
    title: '系统化知识体系',
    icon: '📚',
    emoji: '📚',
    tags: ['Java', 'JVM', '数据库', '分布式'],
    description: (
      <>
        涵盖 Java 核心、并发编程、JVM 调优、数据库原理、分布式架构等核心技术栈，
        构建从基础到进阶的完整知识体系，告别碎片化学习。
      </>
    ),
  },
  {
    title: '深度原理解析',
    icon: '🔍',
    emoji: '🔍',
    tags: ['AQS', 'MVCC', 'Raft', '源码'],
    description: (
      <>
        拒绝浮于表面，深入源码与底层原理，剖析 AQS、MVCC、分布式共识等硬核技术细节，
        真正理解技术的设计思想与权衡取舍。
      </>
    ),
  },
  {
    title: '实战经验沉淀',
    icon: '🛠️',
    emoji: '🛠️',
    tags: ['高可用', '性能优化', '问题排查', 'Rust'],
    description: (
      <>
        结合实际业务场景，分享高可用架构设计、性能优化、线上问题排查等宝贵实战经验，
        让知识真正转化为生产力。
      </>
    ),
  },
];

function Feature({title, icon, description, tags}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        {/* Glow accent on hover */}
        <div className={styles.featureCardGlow} aria-hidden="true" />

        <div className={styles.featureIconWrapper}>
          <span className={styles.featureIcon}>{icon}</span>
          <div className={styles.featureIconRing} aria-hidden="true" />
        </div>

        <div className={styles.featureBody}>
          <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
          <p className={styles.featureDesc}>{description}</p>

          <div className={styles.featureTags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.featureTag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>为什么选择 AiDocs？</h2>
          <p className={styles.sectionSubtitle}>
            专注技术深度，沉淀真实价值
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
