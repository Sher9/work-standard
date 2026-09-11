# Git Worktree 使用指南

> **本项目约定:所有代码修改都在 `worktrees/` 目录下的 worktree 中进行,主仓库(`main`)只负责合并与发布。**

## 1. 本项目的 worktree 布局

```text
work-standard/                 # 主仓库,检出 main
├── .git/
│   └── worktrees/login/                     # 附加 worktree 的元数据
├── AGENTS.md
├── backend/
├── frontend/
├── openspec/
└── worktrees/
    └── login/                               # 附加 worktree,检出 login 分支
        ├── .git                             
        ├── frontend/                        # 完整的项目副本
        ├── backend/
        └── ...
```

- `worktrees/login/.git` **不是目录,而是一个文本文件**,内容指向主仓库的元数据目录
- worktree 是**完整项目副本**(frontend、backend、openspec 都在),可独立安装依赖、构建、测试
- 查看当前所有 worktree:

```bash
git worktree list
```

## 2. 什么是 Git Worktree

Git Worktree 允许你在**同一个仓库**里同时检出**多个分支到多个独立目录**。每个目录是一个独立工作区,互不干扰。

核心原理:`.git/worktrees/` 下为每个附加工作树保存元数据,而**对象库(objects)与引用(refs)全局共享**,不会重复占用 `.git` 体积;只有各工作树的工作文件是独立副本。

## 3. 为什么使用 Worktree

- **并行开发**:多个需求各占一个 worktree,互不干扰,无需反复 checkout
- **即时切换现场**:不必 stash 保存/恢复现场,工作文件天然隔离
- **隔离构建**:每个 worktree 有独立的 `node_modules` / `dist`,避免互相污染
- **安全探索**:在隔离目录里做实验、验证,不破坏主工作区
- **Code Review**:把待评审分支单独拉一个 worktree 查看、跑测试

## 4. 创建 worktree

**4.1 从 main 新建功能分支并创建 worktree(最常用)**

```bash
git worktree add --detach worktrees/login main
```
## 4.2 在 worktree 中开发与提交

worktree 内与普通仓库**完全一样**,`git add` / `git commit` / `git status` 均可:

```bash
cd worktrees/login

git status                       # 查看改动(路径相对当前目录)
git add frontend/src/views/LoginView.vue  #多个文件 git add .
git commit -m "feat(login): 完善登录页样式"
```

**4.3 拿到worktree提交id**

```bash
# cd 到worktrees/test目录下
git rev-parse HEAD  
#不进入worktree目录下
git -C worktrees/test rev-parse HEAD                     
```

**4.4 切换到主分支后 cherry-pick worttree上面代码**

```bash
git cherry-pick a1b2c3d  
```

**4.5 主版本推送**

```bash
git push
```

**4.6 删除worktree工作区**

```bash
git worktree remove worktrees/login
```


## 5. 其他常用用法

**5.1 并行开发多个功能**

```bash
cd D:/work/agent/work-standard
git worktree add -b login     worktrees/login     main
git worktree add -b favorites worktrees/favorites main
```

**5.2 Code Review:把 PR 分支拉成独立工作树**

```bash
git worktree add worktrees/pr-review origin/feature/pay
cd worktrees/pr-review
npm test          # 独立跑该分支测试,不影响正在开发的分支
```

**5.3 隔离实验 / 版本对比**

```bash
git worktree add -b exp/v2 worktrees/exp-v2
git worktree add -b exp/v1 worktrees/exp-v1 v1.0.0
```

**5.4 锁定 / 解锁 / 移动 worktree**

```bash
git worktree lock   worktrees/login -m "正在使用"   # 防止误删/移动
git worktree unlock worktrees/login
git worktree move   worktrees/login ../worktrees/login-v2
```

**5.5 查看 worktree 状态**

```bash
git worktree list
git worktree list --porcelain   # 脚本友好输出
```

## 5.6. 清理 worktree 与分支

```bash
cd D:/work/agent/work-standard
git worktree remove worktrees/login   # 有未提交改动时需先提交/暂存,或用 --force
git branch -d login                   # 分支已合并才允许删除;未合并需 -D(慎用)
git worktree prune                    # 清理 .git/worktrees/ 下已失效的记录
```

> `git worktree remove` 无法在主工作树内部移除主工作树本身;目录被手动删除后,残留元数据用 `git worktree prune` 清理。

## 6. 本项目常见的坑与最佳实践


| 现象                                               | 说明 / 解决                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fatal: 'login' is already checked out at '...'` | 一个分支同一时刻只能在一个 worktree 检出。先 `git worktree remove`,或到对应目录操作                                                                                                                           |
| 主仓库 `git status` 出现 `?? worktrees/`              | `worktrees/` **未被 `.gitignore` 忽略**,主仓库视角下它是未跟踪目录。**不要在主仓库执行 `git add -A` / `git add worktrees/`**,否则会把整个 worktree(含源码副本)误提交进去。建议在 `.gitignore` 增加 `worktrees/`,或把 worktree 放到仓库目录之外 |
| stash 是全局共享的                                     | 所有 worktree 共用同一个 stash 栈。**不要用裸 `git stash pop`**,建议用带唯一标签的 `git stash push -u -m "<标签>"`,恢复时用 `git stash apply <sha>`                                                              |
| 找不到前端/后端依赖                                       | 每个 worktree 独立,需各自 `npm install`                                                                                                                                                     |
| `git status` 路径很奇怪(如 `../frontend/...`)          | 路径是相对当前目录显示的,属正常现象;在仓库根目录操作路径最直观                                                                                                                                                     |
| 合并操作报错找不到 main                                   | 确认在**主仓库**(而非 worktree)里执行,并先 `git checkout main`                                                                                                                                    |
| 并行运行写操作                                          | 不要在同一时间在不同 worktree 里并行 rebase / merge / gc,避免引用竞争                                                                                                                                   |


## 7. 命令速查表


| 命令                                           | 说明                        |
| -------------------------------------------- | ------------------------- |
| `git worktree list`                          | 列出全部 worktree 及分支         |
| `git worktree add <path>`                    | 添加 worktree(基于当前分支)       |
| `git worktree add -b <branch> <path> [base]` | 新建分支并检出到新 worktree        |
| `git worktree remove <path>`                 | 移除 worktree(`--force` 强制) |
| `git worktree prune`                         | 清理失效的 worktree 记录         |
| `git worktree lock / unlock <path>`          | 锁定 / 解锁 worktree          |
| `git worktree move <path> <new>`             | 移动 worktree 目录            |
| `git branch -d <name>`                       | 删除已合并分支(配合清理)             |
| `git merge <branch>`                         | 把分支合并进当前分支                |
| `git push origin <branch>`                   | 推送分支到远端                   |


---

相关文档:[AGENTS.md](AGENTS.md) · [README.md](README.md)