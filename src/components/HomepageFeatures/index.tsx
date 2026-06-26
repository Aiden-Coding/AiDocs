import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '系统化知识体系',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        涵盖 Java 核心、并发编程、JVM 调优、数据库原理、分布式架构等核心技术栈，构建完整的知识体系。
      </>
    ),
  },
  {
    title: '深度原理解析',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        拒绝浮于表面，深入源码与底层原理，剖析 AQS、MVCC、分布式共识等硬核技术细节。
      </>
    ),
  },
  {
    title: '实战经验总结',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        结合实际业务场景，分享高可用架构设计、性能优化、线上问题排查等宝贵实战经验。
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
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
