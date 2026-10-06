#ifndef INCLUDE_DUCKDB_WEB_STATUS_H_
#define INCLUDE_DUCKDB_WEB_STATUS_H_

#include <cstdint>
#include <memory>
#include <sstream>
#include <type_traits>
#include <string>
#include <utility>

namespace duckdb {
namespace web {

/// The outcome of an operation, modelled after the subset of web::Status that was used before Arrow C++ was
/// removed from DuckDB-Wasm
enum class StatusCode : uint8_t {
    OK = 0,
    Invalid,
    KeyError,
    ExecutionError,
    NotImplemented,
    IOError,
    UnknownError,
};

class Status {
   public:
    /// Constructor
    Status() = default;
    /// Constructor
    Status(StatusCode code, std::string message) : code_(code), message_(std::move(message)) {}

    /// Is OK?
    bool ok() const { return code_ == StatusCode::OK; }
    /// Get the code
    StatusCode code() const { return code_; }
    /// Get the message
    const std::string& message() const { return message_; }
    /// Get the code as string
    const char* CodeAsString() const {
        switch (code_) {
            case StatusCode::OK:
                return "OK";
            case StatusCode::Invalid:
                return "Invalid";
            case StatusCode::KeyError:
                return "Key error";
            case StatusCode::ExecutionError:
                return "Execution error";
            case StatusCode::NotImplemented:
                return "Not implemented";
            case StatusCode::IOError:
                return "IO error";
            default:
                return "Unknown error";
        }
    }
    /// Get code and message
    std::string ToString() const { return ok() ? std::string{"OK"} : std::string{CodeAsString()} + ": " + message_; }

    /// Create a status
    static Status OK() { return Status(); }
    template <typename... Args>
    static Status FromArgs(StatusCode code, Args&&... args) {
        std::ostringstream ss;
        (ss << ... << std::forward<Args>(args));
        return Status(code, ss.str());
    }
    template <typename... Args>
    static Status Invalid(Args&&... args) {
        return FromArgs(StatusCode::Invalid, std::forward<Args>(args)...);
    }
    template <typename... Args>
    static Status KeyError(Args&&... args) {
        return FromArgs(StatusCode::KeyError, std::forward<Args>(args)...);
    }
    template <typename... Args>
    static Status ExecutionError(Args&&... args) {
        return FromArgs(StatusCode::ExecutionError, std::forward<Args>(args)...);
    }
    template <typename... Args>
    static Status NotImplemented(Args&&... args) {
        return FromArgs(StatusCode::NotImplemented, std::forward<Args>(args)...);
    }
    template <typename... Args>
    static Status IOError(Args&&... args) {
        return FromArgs(StatusCode::IOError, std::forward<Args>(args)...);
    }
    template <typename... Args>
    static Status UnknownError(Args&&... args) {
        return FromArgs(StatusCode::UnknownError, std::forward<Args>(args)...);
    }

   private:
    StatusCode code_ = StatusCode::OK;
    std::string message_;
};

/// A value or a status
template <typename T>
class Result {
   public:
    /// Constructor from a value, or anything that converts to one
    template <typename U, typename = typename std::enable_if<std::is_convertible<U&&, T>::value &&
                                                             !std::is_same<typename std::decay<U>::type, Status>::value &&
                                                             !std::is_same<typename std::decay<U>::type, Result<T>>::value>::type>
    Result(U&& value) : status_(), value_(std::make_unique<T>(std::forward<U>(value))) {}  // NOLINT: implicit by design
    /// Constructor from a status
    Result(Status status) : status_(std::move(status)) {  // NOLINT: implicit by design
        if (status_.ok()) {
            status_ = Status(StatusCode::UnknownError, "Result constructed from an OK status without a value");
        }
    }
    /// Constructor from a result of a convertible type
    template <typename U, typename = typename std::enable_if<std::is_convertible<U, T>::value &&
                                                             !std::is_same<U, T>::value>::type>
    Result(Result<U>&& other) : status_(other.status()) {  // NOLINT
        if (other.ok()) value_ = std::make_unique<T>(std::move(other).ValueUnsafe());
    }
    Result(const Result& other) : status_(other.status_) {
        if (other.value_) value_ = std::make_unique<T>(*other.value_);
    }
    Result(Result&&) noexcept = default;
    Result& operator=(Result&&) noexcept = default;

    /// Is OK?
    bool ok() const { return value_ != nullptr; }
    /// Get the status
    const Status& status() const { return status_; }
    /// Get the value, the result must be ok
    T& ValueUnsafe() & { return *value_; }
    const T& ValueUnsafe() const& { return *value_; }
    T&& ValueUnsafe() && { return std::move(*value_); }
    /// Get the value, the result must be ok
    T& ValueOrDie() & { return *value_; }
    const T& ValueOrDie() const& { return *value_; }
    T&& ValueOrDie() && { return std::move(*value_); }
    T&& MoveValueUnsafe() { return std::move(*value_); }
    T& operator*() & { return *value_; }
    const T& operator*() const& { return *value_; }
    T&& operator*() && { return std::move(*value_); }
    T* operator->() { return value_.get(); }
    const T* operator->() const { return value_.get(); }

   private:
    Status status_;
    /// The value, held indirectly: it may be a type without default or const copy assignment
    std::unique_ptr<T> value_;
};

/// A byte buffer, handed out as results of the C API
class Buffer {
   public:
    /// Constructor
    explicit Buffer(std::string data) : data_(std::move(data)) {}
    /// Create a buffer of a given size
    static std::shared_ptr<Buffer> Allocate(size_t size) { return std::make_shared<Buffer>(std::string(size, '\0')); }
    /// Create a buffer from a string
    static std::shared_ptr<Buffer> FromString(std::string data) {
        return std::make_shared<Buffer>(std::move(data));
    }

    /// Get the data
    const uint8_t* data() const { return reinterpret_cast<const uint8_t*>(data_.data()); }
    uint8_t* mutable_data() { return reinterpret_cast<uint8_t*>(&data_[0]); }
    /// Get the size
    size_t size() const { return data_.size(); }
    /// Resize the buffer
    void Resize(size_t size) { data_.resize(size); }

   private:
    std::string data_;
};

#define WEB_RETURN_NOT_OK(EXPR)                 \
    do {                                        \
        auto web_status__ = (EXPR);             \
        if (!web_status__.ok()) return web_status__; \
    } while (0)

#define WEB_CONCAT_IMPL(x, y) x##y
#define WEB_CONCAT(x, y) WEB_CONCAT_IMPL(x, y)
#define WEB_ASSIGN_OR_RAISE_IMPL(RESULT, LHS, EXPR) \
    auto&& RESULT = (EXPR);                         \
    if (!RESULT.ok()) return RESULT.status();       \
    LHS = std::move(RESULT).ValueUnsafe();
#define WEB_ASSIGN_OR_RAISE(LHS, EXPR) WEB_ASSIGN_OR_RAISE_IMPL(WEB_CONCAT(web_result__, __COUNTER__), LHS, EXPR)

}  // namespace web
}  // namespace duckdb

#endif
