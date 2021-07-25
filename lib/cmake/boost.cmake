set(BOOST_INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/boost/install")
set(BOOST_INCLUDE_DIR "${BOOST_INSTALL_DIR}/include")

if(NOT EXISTS ${BOOST_INCLUDE_DIR}/boost/version.hpp)
  file(REMOVE ${BOOST_INCLUDE_DIR})
  file(MAKE_DIRECTORY ${BOOST_INCLUDE_DIR})

  find_path(Boost_INCLUDE_DIR
    NAMES boost/version.hpp boost/config.hpp
    HINTS /usr/include /usr/local/include
    NO_CMAKE_FIND_ROOT_PATH)

  if (Boost_INCLUDE_DIR-NOTFOUND)
    message(FATAL_ERROR "Couldn't find boost headers")
  endif ()

  message(STATUS "System Boost  INCLUDE_DIR=${Boost_INCLUDE_DIR}")
  message(STATUS "Install Boost INCLUDE_DIR=${BOOST_INCLUDE_DIR}")
  execute_process(COMMAND cmake -E create_symlink
      "${Boost_INCLUDE_DIR}/boost"
      "${BOOST_INCLUDE_DIR}/boost"
  )
endif ()
