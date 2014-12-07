/**
 * Copyright (C) 2014 Antonin Stefanutti (antonin.stefanutti@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.astefanutti.cdeye.core;


import javax.enterprise.inject.spi.Bean;
import javax.enterprise.inject.spi.InjectionPoint;
import java.util.Collection;
import java.util.List;

public interface CdEye {

    Collection<Bean<?>> getBeans();

    boolean isProducer(Bean<?> bean);

    String getProducerName(Bean<?> bean);

    public List<Bean<?>> getProducers(Class<?> clazz);

    public Bean<?> resolveBean(InjectionPoint ip);

    public String getBeanId(Bean<?> bean);
}
