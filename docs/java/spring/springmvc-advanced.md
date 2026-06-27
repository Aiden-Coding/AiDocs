# Spring MVC 参数解析与返回值处理原理

在 Spring MVC 中，我们可以很自然地在 Controller 方法参数上加 `@RequestBody`、`@PathVariable` 或直接写 `HttpServletRequest`。这背后的核心机制是 **参数解析器（ArgumentResolver）** 和 **返回值处理器（ReturnValueHandler）**。

---

## 一、 参数解析机制：HandlerMethodArgumentResolver

当 `DispatcherServlet` 接收到请求并匹配到目标方法后，它会使用 `HandlerAdapter` 来执行该方法。在执行之前，必须将 HTTP 请求中的数据转换为方法参数。

### 1. 核心接口

```java
public interface HandlerMethodArgumentResolver {
    // 1. 判断是否支持解析该参数
    boolean supportsParameter(MethodParameter parameter);

    // 2. 实际执行解析逻辑
    Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws Exception;
}
```

### 2. 常见内置解析器

| 解析器名称 | 对应注解/参数类型 | 说明 |
| :--- | :--- | :--- |
| `RequestParamMethodArgumentResolver` | `@RequestParam` | 处理查询参数或文件上传 |
| `PathVariableMethodArgumentResolver` | `@PathVariable` | 处理 URI 模板变量 |
| `RequestResponseBodyMethodProcessor` | **`@RequestBody`** | 使用 `HttpMessageConverter` 解析请求体（如 JSON） |
| `ServletRequestMethodArgumentResolver` | `HttpServletRequest` | 直接注入 Servlet 原生对象 |
| `ModelAttributeMethodProcessor` | `@ModelAttribute` | 处理对象表单绑定 |

---

## 二、 返回值处理机制：HandlerMethodReturnValueHandler

方法执行完成后，Spring MVC 需要决定如何处理返回的对象（是跳转页面，还是直接写回 JSON）。

### 1. 核心接口

```java
public interface HandlerMethodReturnValueHandler {
    // 1. 判断是否支持处理该返回值类型
    boolean supportsReturnType(MethodParameter returnType);

    // 2. 处理返回值
    void handleReturnValue(Object returnValue, MethodParameter returnType,
            ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception;
}
```

### 2. 常见内置处理器

- **`ViewNameMethodReturnValueHandler`**：返回 String 类型且不带属性注解时，解析为视图名。
- **`RequestResponseBodyMethodProcessor`**：当方法标注了 **`@ResponseBody`** 时触发。它同样使用 `HttpMessageConverter` 将对象转化为响应流（如 JSON）。

---

## 三、 HttpMessageConverter：数据转换的中枢

无论解析 `@RequestBody` 还是处理 `@ResponseBody`，底层都依赖 `HttpMessageConverter`。

```mermaid
graph LR
    Request[HTTP Request] --> Resolver[@RequestBody Resolver]
    Resolver --> Converter{HttpMessageConverter}
    Converter --> JavaObject[Java Object]
    
    JavaObject --> Logic[Controller Method]
    
    Logic --> Handler[@ResponseBody Handler]
    Handler --> Converter
    Converter --> Response[HTTP Response]
```

### 1. 策略模式的应用

Spring MVC 会根据请求头的 `Content-Type`（输入）和 `Accept`（输出）自动选择合适的转换器：

- `MappingJackson2HttpMessageConverter`：处理 `application/json`。
- `StringHttpMessageConverter`：处理 `text/plain`。
- `Jaxb2RootElementHttpMessageConverter`：处理 `application/xml`。

---

## 四、 进阶：自定义参数解析器

在企业开发中，我们常用自定义解析器来实现**自动注入当前登录用户**的功能。

1. **定义注解**：`@CurrentUser`。
2. **实现解析器**：

   ```java
   public class CurrentUserResolver implements HandlerMethodArgumentResolver {
       @Override
       public boolean supportsParameter(MethodParameter parameter) {
           return parameter.hasParameterAnnotation(CurrentUser.class);
       }

       @Override
       public Object resolveArgument(...) {
           // 从 Session 或 ThreadLocal 中获取用户对象并返回
           return SecurityContext.getUser();
       }
   }
   ```

3. **注册解析器**：

   ```java
   @Configuration
   public class WebConfig implements WebMvcConfigurer {
       @Override
       public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
           resolvers.add(new CurrentUserResolver());
       }
   }
   ```

---

## 五、 面试总结

- **问：Spring MVC 是如何把 JSON 字符串转化为对象的？**
  - 答：由 `RequestMappingHandlerAdapter` 调用 `RequestResponseBodyMethodProcessor` 参数解析器。该解析器内部委派给 `MappingJackson2HttpMessageConverter`，利用 Jackson 库完成反序列化。
- **问：拦截器（Interceptor）与参数解析器的执行顺序？**
  - 答：拦截器的 `preHandle` -> 参数解析器（ArgumentResolver） -> Controller 方法 -> 返回值处理器（ReturnValueHandler） -> 拦截器的 `postHandle`。
