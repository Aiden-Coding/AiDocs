---
id: 1-prompt-and-finetuning
title: Prompt 工程与 LoRA/QLoRA 高效微调
sidebar_position: 2
---

# Prompt 工程与 LoRA/QLoRA 高效微调

在 LLM 应用开发中，我们遵循 **“Prompt 优先，微调补位”** 的基本原则：优先通过提示词工程（Prompt Engineering）发挥通用模型能力；当需要特定领域私有能力、特殊输出格式或极低延迟响应时，再使用轻量微调（PEFT）技术进行定制。

```
                    [大模型能力定制进阶路线]
Prompt 工程 (无需训练)  --->  RAG 检索增强 (知识库)  --->  LoRA/QLoRA 微调 (风格/能力重塑)
```

---

## 1. 高级 Prompt 设计范式（小白必会）

### 1.1 CoT (Chain-of-Thought 思维链)

当大模型面对复杂数学或逻辑题时，直接让它输出答案容易算错。通过引导模型“一步步思考”，显性展开注意力计算轨迹：

```text
Q: 某商店有 15 个苹果，卖出 6 个，又进货 10 个，现在有多少个？
A: 让我们一步步思考：
1. 初始数量为 15 个。
2. 卖出 6 个后剩余：15 - 6 = 9 个。
3. 进货 10 个后数量为：9 + 10 = 19 个。
答案是 19。
```

### 1.2 Structured Output (结构化输出约束)

结合 JSON Schema 或 System Prompt 强制模型返回程序可解析的数据（拒绝废话）：

```text
你是一个专业的 JSON 提取助手。请从用户文本中提取实体并按以下格式返回 JSON：
{
  "name": "姓名",
  "age": 整数或 null,
  "skills": ["技能1", "技能2"]
}
只输出 JSON，不要附加任何 Markdown 标记或解释。
```

---

## 2. 为什么需要 LoRA？（低秩微调通俗原理）

### ❓ 全量微调 vs LoRA 微调
- **全量微调（Full Fine-Tuning）**：像给房子整体拆重建。一个 70 亿参数（7B）的模型，需要更新全部 70 亿个参数，至少需要 80GB 显存的高端 A100 GPU，成本极高。
- **LoRA（低秩微调）**：像在原房子旁边搭一个小号“便签卡片/插件”。原模型 70 亿个参数全被**锁定冻结（Freeze）**，只在模型旁边贴两个很小的旁路矩阵 $A$ 和 $B$（参数量通常只有几百万，仅占 0.1%）。

### 📐 矩阵拆解公式 $W = W_0 + \frac{\alpha}{r} (B \cdot A)$ 通俗图解

假设原模型某个层的权重矩阵 $W_0$ 维度为 $4096 \times 4096$（拥有 16,777,216 个参数）。
LoRA 把要更新的变量矩阵 $\Delta W$ 拆解为两个小矩阵相乘（低秩 $r=16$）：
- 矩阵 $A$：$16 \times 4096$（65,536 个参数）
- 矩阵 $B$：$4096 \times 16$（65,536 个参数）

总参数量从 **1677 万** 剧降到 **13 万**（节省了 99.2% 的可训练参数）！

```mermaid
graph LR
    x[输入向量 x] --> W0[冻结的原模型矩阵 W0 <br/> 4096 * 4096]
    x --> A[小矩阵 A (初始化为高斯分布) <br/> 16 * 4096]
    A --> B[小矩阵 B (初始化为 0) <br/> 4096 * 16]
    B --> Scale[缩放因子 α/r]
    W0 --> Add((+ 相加))
    Scale --> Add
    Add --> y[输出向量 y]
```

#### 💡 高频配置参数“小白字典”：
- **$r$ (Rank, 秩)**：低秩矩阵的中间维度，通常选 `8`, `16`, `32`。$r$ 越大表达能力越强，但显存开销增加。
- **$\alpha$ (Alpha)**：缩放系数，通常设为 $2 \times r$（例如 $r=16, \alpha=32$），用来控制微调参数对原模型输出的干扰程度。
- **SFT (Supervised Fine-Tuning)**：有监督指令微调，即用“问答对 (Instruction - Response)”训练模型学会回答特定问题。
- **`target_modules`**：指定把 LoRA 旁路卡片贴在哪些注意力投影层（如 `q_proj`, `v_proj`）。

---

## 3. QLoRA 与端到端 SFT 微调完整代码

QLoRA 在 LoRA 的基础上引入了 **4-bit NF4（NormalFloat4）量化**，把原本 FP16 的模型压缩 4 倍加载进显存，使 7B 模型只需 **8GB~12GB 显存** 即可完成微调！

下面是包含**数据集定义、模型量化加载与 Trainer 启动**的端到端完整 Python 代码：

```python
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from trl import SFTTrainer

# 1. 准备训练数据 (指令 - 回答 JSON 数据)
train_data = [
    {"instruction": "请解释什么是 RAG？", "output": "RAG 叫检索增强生成，指在大模型回答前先去数据库查资料。"},
    {"instruction": "什么是 LoRA？", "output": "LoRA 是低秩微调技术，只训练很小的旁路矩阵，大幅省显存。"}
]

# 转换为 Hugging Face Dataset 格式
dataset = Dataset.from_list(train_data)

def format_prompts(example):
    # 格式化为标准对话模板
    text = f"<|im_start|>user\n{example['instruction']}<|im_end|>\n<|im_start|>assistant\n{example['output']}<|im_end|>"
    return {"text": text}

dataset = dataset.map(format_prompts)

# 2. 配置 4-bit 量化 (QLoRA)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",               # 专为正态分布权重优化的 4bit 格式
    bnb_4bit_compute_dtype=torch.bfloat16,   # 计算时保持 bfloat16 精度
    bnb_4bit_use_double_quant=True           # 双重量化进一步节省显存
)

model_id = "Qwen/Qwen2.5-7B-Instruct"

# 3. 加载 Tokenizer 与 4bit 量化模型
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto"
)

# 4. 配置 LoRA 参数
peft_config = LoraConfig(
    r=16,                                    # 秩设置为 16
    lora_alpha=32,                           # 缩放系数 32
    target_modules=["q_proj", "v_proj"],     # 挂载到 Q 和 V 矩阵
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, peft_config)
model.print_trainable_parameters()
# 输出: trainable params: 4,194,304 || all params: 7,615,616,000 || trainable%: 0.055%

# 5. 配置训练参数并启动 Trainer
training_args = TrainingArguments(
    output_dir="./qwen_lora_output",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    logging_steps=10,
    max_steps=50,                            # 演示训练 50 步
    fp16=True,
    save_strategy="no"
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=512,
    args=training_args
)

# 启动微调
print("开始 QLoRA 微调...")
trainer.train()
print("微调完成！LoRA 权重已就绪。")
```
