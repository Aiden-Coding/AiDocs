---
id: 2-vector-database-and-embedding
title: 2. Embedding 与向量数据库实战 (Qdrant/Chroma)
sidebar_position: 3
---

# 2. Embedding 与向量数据库实战 (Qdrant/Chroma)

切分好的文档段落（Chunk）如何快速进行语义搜索？我们需要借助 **Embedding 模型** 与专门的 **向量数据库（Vector DB）**。

---

## 🔮 1. Embedding 模型选型

Embedding 模型负责将文本文本转换为高维向量（如 768 或 1024 维）：
- **中文推荐选型**：`BAAI/bge-m3`（支持多语言、多粒度、混合检索）、`text-embedding-3-small`（OpenAI）。

---

## 🗄️ 2. 向量数据库 vs 传统数据库

传统 SQL 数据库使用 `WHERE text LIKE '%关键词%'`，只能进行**字面精准匹配**（搜索“苹果”，搜不到“iPhone”）。

向量数据库采用 **HNSW** 等近似近邻算法（ANN），通过计算余弦距离，实现**语义相似度模糊搜索**！

---

## 💻 3. Python 轻量级向量数据库 Chroma 实战

下面用 20 行代码展示文档入库与语义检索全流程：

```python
import chromadb
from chromadb.utils import embedding_functions

# 1. 初始化 Chroma 本地向量数据库客户端
client = chromadb.Client()

# 2. 使用默认轻量 Embedding 模型创建集合 (Collection)
collection = client.create_collection(name="company_kb")

# 3. 准备知识库文档数据
documents = [
    "公司员工年假规定：工作满1年享有5天带薪年假。",
    "出差报销标准：一线城市住宿补贴为每天 500 元。",
    "无线网络 Wi-Fi 密码是 Company2026!，请勿外传。"
]
ids = ["doc1", "doc2", "doc3"]

# 4. 文档批量入库 (自动向量化)
collection.add(
    documents=documents,
    ids=ids
)

# 5. 用户提问语义检索 (即便没有出现“休假”二字也能查到)
query_text = "我今年入职，能休几天假？"
results = collection.query(
    query_texts=[query_text],
    n_results=1 # 返回最相似的 1 条结果
)

print("查询问题:", query_text)
print("检索到的最匹配知识库段落:\n", results['documents'][0][0])
# 匹配输出: "公司员工年假规定：工作满1年享有5天带薪年假。"
```
